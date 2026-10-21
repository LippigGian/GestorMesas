import { supabase } from "@/lib/supabase";

export type EstadoQr = "creando" | "pendiente" | "verificado" | "registrado" | "vencido" | "cancelado" | "fallido" | "acreditado_sin_registrar";
export type CobroQr = {
  intentoId: string;
  estado: EstadoQr;
  monto: number;
  qrData: string | null;
  venceAt: string;
  error?: string;
};

async function invocar(body: object): Promise<CobroQr> {
  const { data, error } = await supabase.functions.invoke<CobroQr & { error?: string }>("mercado-pago-qr", { body });
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
  return data;
}

export function crearCobroQr(pedidoId: string, medioPagoId: string) {
  return invocar({ accion: "crear", pedidoId, medioPagoId });
}

export function consultarCobroQr(intentoId: string) {
  return invocar({ accion: "consultar", intentoId });
}
