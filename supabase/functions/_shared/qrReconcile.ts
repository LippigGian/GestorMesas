import type { SupabaseClient } from "npm:@supabase/supabase-js@2.111.0";

export type QrAttempt = {
  id: string;
  local_id: string;
  pedido_id: string;
  medio_pago_id: string;
  arqueo_caja_id: string;
  monto: number;
  estado: string;
  idempotency_key: string;
  mp_order_id: string | null;
  qr_data: string | null;
  vence_at: string;
  modo: "static" | "dynamic";
  pos_external_id: string | null;
  cancel_idempotency_key: string;
};

type MpOrder = {
  id?: string;
  type?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  total_paid_amount?: string;
  currency?: string;
  config?: { qr?: { external_pos_id?: string } };
  type_response?: { qr_data?: string };
  transactions?: { payments?: Array<{ status?: string; status_detail?: string; paid_amount?: string }> };
};

export type ReconcileResult = { estado: string; error?: string; retryable?: boolean };
const ordersUrl = "https://api.mercadopago.com/v1/orders";

export function qrReference(id: string) { return `GM_${id.replaceAll("-", "")}`; }

export function classifyOrder(order: MpOrder, attempt: QrAttempt): ReconcileResult {
  if (order.id !== attempt.mp_order_id || order.type !== "qr"
    || order.external_reference !== qrReference(attempt.id)
    || !Number.isFinite(Number(order.total_amount))
    || Math.abs(Number(order.total_amount) - Number(attempt.monto)) > 0.01
    || (order.currency && order.currency !== "ARS")
    || (order.config?.qr?.external_pos_id && order.config.qr.external_pos_id !== attempt.pos_external_id)) {
    return { estado: "revision", error: "La orden de Mercado Pago no coincide con el intento local." };
  }
  if (order.status === "processed") {
    if (!["processed", "accredited"].includes(order.status_detail ?? "")) {
      return { estado: "revision", error: "La orden procesada tiene un detalle de estado inesperado." };
    }
    const payments = order.transactions?.payments?.filter(
      (payment) => payment.status === "processed" && payment.status_detail === "accredited"
    ) ?? [];
    if (payments.length !== 1 || !Number.isFinite(Number(payments[0].paid_amount))
      || Math.abs(Number(payments[0].paid_amount) - Number(attempt.monto)) > 0.01
      || (order.total_paid_amount !== undefined && Math.abs(Number(order.total_paid_amount) - Number(attempt.monto)) > 0.01)) {
      return { estado: "revision", error: "El importe acreditado no coincide con el pedido." };
    }
    return { estado: "acreditado" };
  }
  if (order.status === "expired") return { estado: "vencido" };
  if (order.status === "canceled") return { estado: "cancelado" };
  if (order.status === "refunded") return { estado: "revision", error: "Mercado Pago informa un reembolso; requiere revision manual." };
  if (order.status === "created") return { estado: "pendiente" };
  return { estado: "revision", error: "Estado de Mercado Pago desconocido; requiere revision manual." };
}

async function note(admin: SupabaseClient, attempt: QrAttempt, error: string | null, review = false) {
  await admin.from("mercado_pago_qr_intentos").update({
    ultima_consulta_at: new Date().toISOString(),
    requiere_revision: review,
    motivo_revision: error,
  }).eq("id", attempt.id);
}

export async function reconcileAttempt(admin: SupabaseClient, token: string, attempt: QrAttempt, inspectRegistered = false): Promise<ReconcileResult> {
  if (attempt.estado === "registrado" && !inspectRegistered) return { estado: "registrado" };
  if (["vencido", "cancelado", "fallido"].includes(attempt.estado)) return { estado: attempt.estado };
  if (!attempt.mp_order_id) return { estado: "creando", error: "La orden aun no tiene ID de Mercado Pago." };
  let order: MpOrder;
  try {
    const res = await fetch(`${ordersUrl}/${encodeURIComponent(attempt.mp_order_id)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return { estado: attempt.estado, error: `No se pudo consultar Mercado Pago (HTTP ${res.status}).`, retryable: true };
    order = await res.json() as MpOrder;
  } catch {
    return { estado: attempt.estado, error: "No se pudo consultar Mercado Pago.", retryable: true };
  }
  const result = classifyOrder(order, attempt);
  if (["verificado", "registrado"].includes(attempt.estado) && result.estado !== "acreditado") {
    await note(admin, attempt, "Una orden ya verificada cambio de estado; requiere revision manual.", true);
    return { estado: "revision", error: "La orden verificada cambio de estado; requiere revision manual." };
  }
  if (result.estado === "revision") {
    await note(admin, attempt, result.error ?? "Revision manual requerida.", true);
    return result;
  }
  if (attempt.estado === "registrado") {
    await note(admin, attempt, null);
    return { estado: "registrado" };
  }
  if (result.estado === "acreditado") {
    const { error: verifyError } = await admin.from("mercado_pago_qr_intentos")
      .update({ estado: "verificado", ultima_consulta_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", attempt.id).in("estado", ["pendiente", "verificado"]);
    if (verifyError) return { estado: "verificado", error: "Pago acreditado, pero no se pudo guardar la verificacion.", retryable: true };
    const { error: registerError } = await admin.rpc("registrar_cobro_qr_mercado_pago", { p_intento_id: attempt.id });
    if (registerError) {
      await note(admin, attempt, registerError.message, true);
      return { estado: "acreditado_sin_registrar", error: `Pago acreditado pero no registrado. Revisa la orden ${attempt.mp_order_id}: ${registerError.message}`, retryable: true };
    }
    return { estado: "registrado" };
  }
  if (["vencido", "cancelado"].includes(result.estado)) {
    const { error } = await admin.from("mercado_pago_qr_intentos")
      .update({ estado: result.estado, ultima_consulta_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", attempt.id).in("estado", ["creando", "pendiente", "verificado"]);
    if (error) return { estado: attempt.estado, error: "No se pudo guardar el estado final de la orden.", retryable: true };
  } else {
    await note(admin, attempt, null);
  }
  return result;
}

export async function recoverCreation(admin: SupabaseClient, token: string, attempt: QrAttempt): Promise<ReconcileResult> {
  if (attempt.mp_order_id || attempt.estado !== "creando" || !attempt.pos_external_id) return { estado: attempt.estado };
  if (Date.now() - new Date(attempt.vence_at).getTime() > 5 * 60_000) {
    await note(admin, attempt, "La orden quedo sin ID y supero su ventana de recuperacion.", true);
    return { estado: "revision", error: "La orden debe revisarse manualmente antes de liberar la caja." };
  }
  let order: MpOrder;
  try {
    const res = await fetch(ordersUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json",
        "X-Idempotency-Key": attempt.idempotency_key,
      },
      body: JSON.stringify({
        type: "qr", total_amount: Number(attempt.monto).toFixed(2), external_reference: qrReference(attempt.id),
        expiration_time: "PT15M", transactions: { payments: [{ amount: Number(attempt.monto).toFixed(2) }] },
        config: { qr: { external_pos_id: attempt.pos_external_id, mode: attempt.modo } },
      }),
    });
    if (!res.ok) {
      await note(admin, attempt, `No se pudo recuperar la creacion (HTTP ${res.status}).`, true);
      return { estado: "creando", error: `Mercado Pago rechazo la recuperacion (HTTP ${res.status}).`, retryable: res.status >= 500 || res.status === 429 };
    }
    order = await res.json() as MpOrder;
  } catch {
    return { estado: "creando", error: "No se pudo recuperar la creacion de la orden.", retryable: true };
  }
  if (!order.id || order.external_reference !== qrReference(attempt.id)
    || Math.abs(Number(order.total_amount) - Number(attempt.monto)) > 0.01
    || (attempt.modo === "dynamic" && !order.type_response?.qr_data)) {
    await note(admin, attempt, "Mercado Pago devolvio una orden incompleta al recuperar.", true);
    return { estado: "revision", error: "La orden recuperada no coincide con el intento." };
  }
  const { data, error } = await admin.from("mercado_pago_qr_intentos")
    .update({ estado: "pendiente", mp_order_id: order.id, qr_data: order.type_response?.qr_data ?? null, updated_at: new Date().toISOString() })
    .eq("id", attempt.id).eq("estado", "creando").select("*").maybeSingle();
  if (error) return { estado: "creando", error: "No se pudo guardar la orden recuperada.", retryable: true };
  if (!data) return { estado: "pendiente" };
  return reconcileAttempt(admin, token, data as QrAttempt);
}
