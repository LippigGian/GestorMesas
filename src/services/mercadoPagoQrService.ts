import { supabase } from "@/lib/supabase";

export type EstadoQr = "creando" | "pendiente" | "verificado" | "registrado" | "vencido" | "cancelado" | "fallido" | "acreditado_sin_registrar";
export type CobroQr = {
  intentoId: string;
  estado: EstadoQr;
  modo: "static" | "dynamic";
  monto: number;
  qrData: string | null;
  venceAt: string;
  error?: string;
};

async function invocar<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string; estado?: EstadoQr }>("mercado-pago-qr", { body });
  if (error) {
    if (error.context instanceof Response) {
      const detalle: unknown = await error.context.json().catch(() => null);
      if (detalle && typeof detalle === "object" && "error" in detalle && typeof detalle.error === "string") {
        throw new Error(detalle.error);
      }
      throw new Error(`No se pudo completar la solicitud de QR (HTTP ${error.context.status}).`);
    }
    throw new Error(error.message || "No se pudo conectar con Mercado Pago.");
  }
  if (!data) throw new Error("Mercado Pago no respondió.");
  if (data.error && data.estado !== "acreditado_sin_registrar") throw new Error(data.error);
  return data as T;
}

export function crearCobroQr(pedidoId: string, medioPagoId: string, modo: "static" | "dynamic") {
  return invocar<CobroQr>({ accion: "crear", pedidoId, medioPagoId, modo });
}

export function consultarCobroQr(intentoId: string) {
  return invocar<CobroQr>({ accion: "consultar", intentoId });
}

export function cancelarCobroQr(intentoId: string) {
  return invocar<CobroQr>({ accion: "cancelar", intentoId });
}

export function obtenerCajaQr() {
  return invocar<{ qrData: string; templateDocument: string | null }>({ accion: "caja" });
}
