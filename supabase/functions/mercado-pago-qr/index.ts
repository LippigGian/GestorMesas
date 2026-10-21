import { createClient } from "npm:@supabase/supabase-js@2.111.0";

type Intento = {
  id: string; local_id: string; pedido_id: string; medio_pago_id: string;
  arqueo_caja_id: string; monto: number; estado: string; idempotency_key: string;
  mp_order_id: string | null; qr_data: string | null; vence_at: string;
  modo: "static" | "dynamic"; pos_external_id: string | null; cancel_idempotency_key: string;
};
type Orden = {
  id?: string; status?: string; status_detail?: string; external_reference?: string;
  total_amount?: string; total_paid_amount?: string; currency?: string;
  type_response?: { qr_data?: string };
  transactions?: { payments?: Array<{ status?: string; status_detail?: string; paid_amount?: string }> };
};

const urlMp = "https://api.mercadopago.com/v1/orders";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respuesta(status: number, body: object, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: {
    "Content-Type": "application/json", "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin",
  } });
}

function referencia(id: string) { return `GM_${id.replaceAll("-", "")}`; }
function montoTexto(monto: number) { return Number(monto).toFixed(2); }
function vista(intento: Intento, estado = intento.estado) {
  return { intentoId: intento.id, estado, modo: intento.modo, monto: Number(intento.monto), qrData: intento.qr_data, venceAt: intento.vence_at };
}

Deno.serve(async (req) => {
  const appUrl = Deno.env.get("MERCADO_PAGO_QR_APP_URL") ?? "";
  let origin = "";
  try { origin = new URL(appUrl).origin; } catch { return respuesta(503, { error: "Falta configurar MERCADO_PAGO_QR_APP_URL." }, ""); }
  if (req.headers.get("Origin") && req.headers.get("Origin") !== origin) return respuesta(403, { error: "Origen no autorizado." }, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin",
  } });
  if (req.method !== "POST") return respuesta(405, { error: "Método no permitido." }, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tokenMp = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const posId = Deno.env.get("MERCADO_PAGO_POS_ID");
  const localConfigurado = Deno.env.get("MERCADO_PAGO_LOCAL_ID");
  const authorization = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey || !tokenMp || !posId || !localConfigurado) return respuesta(503, { error: "El QR todavía no está configurado para esta cafetería." }, origin);
  if (!/^Bearer\s+\S+$/i.test(authorization)) return respuesta(401, { error: "Iniciá sesión para cobrar." }, origin);
  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await userClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (authError || !auth.user) return respuesta(401, { error: "Tu sesión venció." }, origin);
  const { data: permisos, error: permisosError } = await userClient.rpc("mis_permisos");
  const localId = permisos?.local_id;
  if (permisosError || !localId || localId !== localConfigurado) return respuesta(403, { error: "Mercado Pago no está conectado a tu cafetería." }, origin);

  let input: { accion?: string; pedidoId?: string; medioPagoId?: string; intentoId?: string; modo?: string };
  try { input = await req.json(); } catch { return respuesta(400, { error: "Solicitud inválida." }, origin); }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const headers = { Authorization: `Bearer ${tokenMp}`, Accept: "application/json" };

  async function consultar(intento: Intento) {
    if (intento.estado === "registrado") return respuesta(200, vista(intento), origin);
    if (["vencido", "cancelado", "fallido"].includes(intento.estado)) return respuesta(200, vista(intento), origin);
    if (!intento.mp_order_id) return respuesta(200, vista(intento), origin);
    let orden: Orden;
    try {
      const res = await fetch(`${urlMp}/${encodeURIComponent(intento.mp_order_id)}`, { headers });
      if (!res.ok) return respuesta(502, { error: "No se pudo verificar la orden con Mercado Pago. No se registró ningún cobro." }, origin);
      orden = await res.json() as Orden;
    } catch { return respuesta(502, { error: "No se pudo consultar Mercado Pago. Reintentá sin crear otro QR." }, origin); }
    if (orden.id !== intento.mp_order_id || orden.external_reference !== referencia(intento.id)
      || Math.abs(Number(orden.total_amount) - Number(intento.monto)) > 0.01) {
      return respuesta(502, { error: "La orden no coincide con este pedido. No se registró el cobro." }, origin);
    }
    if (orden.status === "processed" && orden.status_detail === "processed") {
      const pagosAcreditados = orden.transactions?.payments?.filter((pago) => pago.status === "processed" && pago.status_detail === "accredited") ?? [];
      const montoAcreditado = pagosAcreditados.reduce((suma, pago) => suma + Number(pago.paid_amount), 0);
      if (pagosAcreditados.length !== 1 || !Number.isFinite(montoAcreditado)
        || Math.abs(montoAcreditado - Number(intento.monto)) > 0.01 || (orden.currency && orden.currency !== "ARS")) {
        return respuesta(502, { error: "El importe acreditado no coincide. Requiere conciliación manual." }, origin);
      }
      const { error: verificarError } = await admin.from("mercado_pago_qr_intentos").update({ estado: "verificado", updated_at: new Date().toISOString() }).eq("id", intento.id).in("estado", ["pendiente", "verificado"]);
      if (verificarError) return respuesta(500, { error: "Pago acreditado, pero no se pudo guardar la verificación. Reintentá la consulta." }, origin);
      const { error: registrarError } = await userClient.rpc("registrar_cobro_qr_mercado_pago", { p_intento_id: intento.id });
      if (registrarError) return respuesta(200, { ...vista(intento, "acreditado_sin_registrar"), error: `Mercado Pago acreditó el pago, pero no pudo registrarse en la venta: ${registrarError.message}. No vuelvas a cobrar; conciliá esta orden: ${intento.mp_order_id}.` }, origin);
      return respuesta(200, { ...vista(intento, "registrado"), qrData: null }, origin);
    }
    if (["canceled", "expired", "refunded"].includes(orden.status ?? "")) {
      const estado = orden.status === "expired" ? "vencido" : "cancelado";
      await admin.from("mercado_pago_qr_intentos").update({ estado, updated_at: new Date().toISOString() }).eq("id", intento.id);
      return respuesta(200, vista(intento, estado), origin);
    }
    return respuesta(200, vista(intento, "pendiente"), origin);
  }

  if (input.accion === "caja") {
    try {
      const res = await fetch(`https://api.mercadopago.com/v2/pos?external_id=${encodeURIComponent(posId)}&limit=1`, { headers });
      if (!res.ok) return respuesta(502, { error: "No se pudo consultar la caja QR de Mercado Pago." }, origin);
      const busqueda = await res.json() as { data?: Array<{ external_id?: string; status?: string; qr_response?: { qr_code?: string; template_document?: string } }> };
      const caja = busqueda.data?.find((pos) => pos.external_id === posId);
      if (!caja || caja.status !== "active" || !caja.qr_response?.qr_code) {
        return respuesta(404, { error: "La caja no tiene un QR impreso activo. Revisá el POS configurado." }, origin);
      }
      return respuesta(200, { qrData: caja.qr_response.qr_code, templateDocument: caja.qr_response.template_document ?? null }, origin);
    } catch { return respuesta(502, { error: "No se pudo consultar el QR impreso de Mercado Pago." }, origin); }
  }

  if (input.accion === "consultar" && input.intentoId && uuid.test(input.intentoId)) {
    const { data, error } = await admin.from("mercado_pago_qr_intentos").select("*").eq("id", input.intentoId).eq("local_id", localId).single();
    if (error || !data) return respuesta(404, { error: "QR no encontrado." }, origin);
    return consultar(data as Intento);
  }
  if (input.accion === "cancelar" && input.intentoId && uuid.test(input.intentoId)) {
    const { data, error } = await admin.from("mercado_pago_qr_intentos").select("*").eq("id", input.intentoId).eq("local_id", localId).single();
    if (error || !data) return respuesta(404, { error: "QR no encontrado." }, origin);
    const intentoCancelar = data as Intento;
    if (["registrado", "vencido", "cancelado", "fallido"].includes(intentoCancelar.estado)) return respuesta(200, vista(intentoCancelar), origin);
    if (!intentoCancelar.mp_order_id) return respuesta(409, { error: "La orden aún no tiene ID de Mercado Pago. Reintentá la consulta antes de cancelarla." }, origin);
    const comprobacion = await consultar(intentoCancelar);
    if (!comprobacion.ok) return comprobacion;
    const { data: actualizado } = await admin.from("mercado_pago_qr_intentos").select("*").eq("id", intentoCancelar.id).single();
    if (!actualizado) return respuesta(503, { error: "No se pudo verificar el estado actual de la orden." }, origin);
    if (actualizado.estado !== "pendiente") return comprobacion;
    try {
      const res = await fetch(`${urlMp}/${encodeURIComponent(intentoCancelar.mp_order_id)}/cancel`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json", "X-Idempotency-Key": intentoCancelar.cancel_idempotency_key },
      });
      if (!res.ok) return respuesta(502, { error: "Mercado Pago no confirmó la cancelación. Consultá el estado antes de crear otro cobro." }, origin);
      const ordenCancelada = await res.json() as Orden;
      if (ordenCancelada.id !== intentoCancelar.mp_order_id || ordenCancelada.status !== "canceled") {
        return respuesta(502, { error: "No se pudo confirmar la cancelación de la orden en Mercado Pago." }, origin);
      }
      const { data: cancelada, error: cancelarError } = await admin.from("mercado_pago_qr_intentos")
        .update({ estado: "cancelado", updated_at: new Date().toISOString() }).eq("id", intentoCancelar.id).eq("estado", "pendiente").select("*").maybeSingle();
      if (cancelarError || !cancelada) return respuesta(500, { error: "Mercado Pago canceló la orden, pero no se pudo liberar la caja en la base de datos." }, origin);
      return respuesta(200, vista(intentoCancelar, "cancelado"), origin);
    } catch { return respuesta(502, { error: "No se pudo consultar la cancelación en Mercado Pago. Reintentá antes de cobrar por otro medio." }, origin); }
  }
  if (input.accion !== "crear" || !input.pedidoId || !uuid.test(input.pedidoId)
    || !input.medioPagoId || !uuid.test(input.medioPagoId) || !["static", "dynamic"].includes(input.modo ?? "")) return respuesta(400, { error: "Pedido, medio de pago o modo de QR inválido." }, origin);
  const modo = input.modo as "static" | "dynamic";

  const { data: pedido, error: pedidoError } = await userClient.from("pedidos").select("id, estado, local_id").eq("id", input.pedidoId).eq("local_id", localId).single();
  if (pedidoError || !pedido || pedido.estado !== "abierto") return respuesta(409, { error: "El pedido ya no está abierto." }, origin);
  const { data: medio } = await userClient.from("medios_pago").select("id, nombre, activo").eq("id", input.medioPagoId).eq("local_id", localId).single();
  if (!medio?.activo || !/(^|\s)qr($|\s)|mercado\s*pago/i.test(medio.nombre)) return respuesta(400, { error: "Seleccioná el medio de pago QR de Mercado Pago." }, origin);
  const { data: intentos } = await admin.from("mercado_pago_qr_intentos").select("*").eq("pedido_id", input.pedidoId).eq("local_id", localId).in("estado", ["creando", "pendiente", "verificado"]).limit(1);
  let intento = intentos?.[0] as Intento | undefined;
  if (intento?.medio_pago_id !== undefined && intento.medio_pago_id !== input.medioPagoId) {
    return respuesta(409, { error: "Ya hay un QR activo con otro medio de pago para este pedido." }, origin);
  }
  if (intento && (intento.modo !== modo || (intento.pos_external_id && intento.pos_external_id !== posId))) {
    return respuesta(409, { error: "Este pedido ya tiene otra orden QR activa. Consultá su estado antes de cambiar de modo o caja." }, origin);
  }
  if (intento?.estado === "verificado") return consultar(intento);
  if (intento?.mp_order_id) return consultar(intento);

  if (!intento) {
      const { data: ocupadas, error: ocupacionError } = await admin.from("mercado_pago_qr_intentos")
        .select("id,mp_order_id").eq("local_id", localId).eq("pos_external_id", posId)
        .in("estado", ["creando", "pendiente", "verificado"]).limit(1);
      if (ocupacionError) return respuesta(503, { error: "No se pudo comprobar si el QR impreso está libre." }, origin);
      if (ocupadas?.length) {
        if (ocupadas[0].mp_order_id) {
          const { data: ocupada } = await admin.from("mercado_pago_qr_intentos").select("*").eq("id", ocupadas[0].id).single();
          if (ocupada) await consultar(ocupada as Intento);
        }
        const { data: sigueOcupada } = await admin.from("mercado_pago_qr_intentos")
          .select("id").eq("id", ocupadas[0].id).in("estado", ["creando", "pendiente", "verificado"]).maybeSingle();
        if (sigueOcupada) return respuesta(409, { error: "La caja QR ya está asignada a otro pedido. Terminá o conciliá ese cobro antes de usarla de nuevo." }, origin);
      }
    const { data: items, error: itemsError } = await userClient.from("pedido_items").select("subtotal").eq("pedido_id", pedido.id);
    const { data: pagos, error: pagosError } = await userClient.from("pedido_pagos").select("monto").eq("pedido_id", pedido.id);
    const { data: arqueos, error: cajaError } = await userClient.from("arqueos_caja").select("id").eq("local_id", localId).eq("estado", "abierto");
    if (itemsError || pagosError || cajaError || arqueos?.length !== 1) return respuesta(409, { error: "Abrí una única caja antes de generar el QR." }, origin);
    const monto = Math.round(((items ?? []).reduce((s, i) => s + Number(i.subtotal), 0) - (pagos ?? []).reduce((s, p) => s + Number(p.monto), 0)) * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) return respuesta(409, { error: "El pedido no tiene saldo pendiente." }, origin);
    const { data, error } = await admin.from("mercado_pago_qr_intentos").insert({
      local_id: localId, pedido_id: pedido.id, medio_pago_id: medio.id, arqueo_caja_id: arqueos[0].id,
      creado_por: auth.user.id, monto, estado: "creando", modo, pos_external_id: posId,
    }).select("*").single();
    if (error || !data) return respuesta(409, { error: "La caja QR o este pedido ya tienen una orden activa. Volvé a abrir el cobro." }, origin);
    intento = data as Intento;
  }

  let orden: Orden;
  try {
    const res = await fetch(urlMp, { method: "POST", headers: {
      ...headers, "Content-Type": "application/json", "X-Idempotency-Key": intento.idempotency_key,
    }, body: JSON.stringify({
      type: "qr", total_amount: montoTexto(intento.monto), external_reference: referencia(intento.id),
      expiration_time: "PT15M", transactions: { payments: [{ amount: montoTexto(intento.monto) }] },
      config: { qr: { external_pos_id: posId, mode: intento.modo } },
    }) });
    if (!res.ok) {
      const errorMp: unknown = await res.json().catch(() => null);
      const codigo = errorMp && typeof errorMp === "object" && "error" in errorMp && typeof errorMp.error === "string"
        && /^[a-z0-9_]{1,80}$/i.test(errorMp.error) ? errorMp.error : null;
      console.error("Mercado Pago rechazó la orden QR", { status: res.status, codigo });
      if ([400, 401, 403, 404, 422].includes(res.status)) {
        await admin.from("mercado_pago_qr_intentos").update({ estado: "fallido", updated_at: new Date().toISOString() }).eq("id", intento.id);
      }
      const detalle = codigo ? ` (${codigo})` : "";
      if (res.status === 401) return respuesta(502, { error: `Mercado Pago rechazó el Access Token${detalle}. Verificá que corresponda a la aplicación QR.` }, origin);
      if (res.status === 404 && codigo === "pos_not_found") return respuesta(502, { error: "Mercado Pago no encontró la caja/POS. Revisá su external_id y que pertenezca a la cuenta del token." }, origin);
      if (res.status >= 500 || res.status === 409 || res.status === 429) return respuesta(502, { error: `Mercado Pago no confirmó la creación del QR (HTTP ${res.status}${detalle}). Reintentá sin cambiar el pedido.` }, origin);
      return respuesta(502, { error: `Mercado Pago rechazó la orden QR (HTTP ${res.status}${detalle}). Revisá el POS y las credenciales de prueba.` }, origin);
    }
    orden = await res.json() as Orden;
  } catch { return respuesta(502, { error: "No se pudo crear el QR. Reintentá; se usará la misma clave para evitar duplicados." }, origin); }
  if (!orden.id || (intento.modo === "dynamic" && !orden.type_response?.qr_data) || orden.external_reference !== referencia(intento.id)
    || Math.abs(Number(orden.total_amount) - Number(intento.monto)) > 0.01) {
    return respuesta(502, { error: "Mercado Pago devolvió una orden incompleta. No la cobres; revisá la integración." }, origin);
  }
  const { data: guardado, error: guardarError } = await admin.from("mercado_pago_qr_intentos").update({
    estado: "pendiente", mp_order_id: orden.id, qr_data: orden.type_response.qr_data, updated_at: new Date().toISOString(),
  }).eq("id", intento.id).select("*").single();
  if (guardarError || !guardado) return respuesta(500, { error: "El QR se creó pero no se pudo guardar. No generes otro; contactá al administrador." }, origin);
  return respuesta(200, vista(guardado as Intento), origin);
});
