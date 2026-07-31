import type { Gasto } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export type GastoInput = {
  fecha: string;
  importe: number;
  proveedor?: string;
  categoria?: string;
  comentario?: string;
  medioPagoId: string;
};

type GastoRow = {
  id: string;
  arqueo_caja_id: string;
  medio_pago_id: string;
  fecha: string;
  importe: number;
  proveedor: string | null;
  categoria: string | null;
  comentario: string | null;
  created_at: string;
  medios_pago?: { nombre: string } | { nombre: string }[] | null;
  arqueos_caja?: { estado: "abierto" | "cerrado" | "cancelado" } | { estado: "abierto" | "cerrado" | "cancelado" }[] | null;
};

function obtenerRelacion<T>(relacion: T | T[] | null | undefined): T | undefined {
  return Array.isArray(relacion) ? relacion[0] : relacion ?? undefined;
}

function mapGasto(row: GastoRow): Gasto {
  const medioPago = obtenerRelacion(row.medios_pago);
  const arqueo = obtenerRelacion(row.arqueos_caja);

  return {
    id: row.id,
    arqueoCajaId: row.arqueo_caja_id,
    arqueoCajaEstado: arqueo?.estado,
    medioPagoId: row.medio_pago_id,
    medioPagoNombre: medioPago?.nombre,
    fecha: row.fecha,
    importe: Number(row.importe),
    proveedor: row.proveedor ?? undefined,
    categoria: row.categoria ?? undefined,
    comentario: row.comentario ?? undefined,
    createdAt: row.created_at,
  };
}

const selectGasto =
  "id, arqueo_caja_id, medio_pago_id, fecha, importe, proveedor, categoria, comentario, created_at, medios_pago(nombre), arqueos_caja(estado)";

async function obtenerArqueoAbiertoId() {
  const { data, error } = await supabase
    .from("arqueos_caja")
    .select("id")
    .eq("estado", "abierto");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("No hay un arqueo de caja abierto para registrar gastos.");
  }

  if (data.length > 1) {
    throw new Error("Hay mas de un arqueo abierto. Cierra una caja antes de registrar gastos.");
  }

  return data[0].id as string;
}

async function asegurarArqueoAbierto(arqueoCajaId: string) {
  const { data, error } = await supabase
    .from("arqueos_caja")
    .select("estado")
    .eq("id", arqueoCajaId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data.estado !== "abierto") {
    throw new Error("No se puede modificar un gasto de un arqueo cerrado.");
  }
}

export async function obtenerGastos(): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select(selectGasto)
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as GastoRow[]).map(mapGasto);
}

export async function crearGasto(input: GastoInput): Promise<Gasto> {
  const arqueoCajaId = await obtenerArqueoAbiertoId();

  const { data, error } = await supabase
    .from("gastos")
    .insert({
      arqueo_caja_id: arqueoCajaId,
      medio_pago_id: input.medioPagoId,
      fecha: new Date(input.fecha).toISOString(),
      importe: input.importe,
      proveedor: input.proveedor?.trim() || null,
      categoria: input.categoria?.trim() || null,
      comentario: input.comentario?.trim() || null,
    })
    .select(selectGasto)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapGasto(data as unknown as GastoRow);
}

export async function actualizarGasto(gastoId: string, input: GastoInput): Promise<Gasto> {
  const { data: gastoActual, error: gastoError } = await supabase
    .from("gastos")
    .select("arqueo_caja_id")
    .eq("id", gastoId)
    .single();

  if (gastoError) {
    throw new Error(gastoError.message);
  }

  await asegurarArqueoAbierto(String(gastoActual.arqueo_caja_id));

  const { data, error } = await supabase
    .from("gastos")
    .update({
      medio_pago_id: input.medioPagoId,
      fecha: new Date(input.fecha).toISOString(),
      importe: input.importe,
      proveedor: input.proveedor?.trim() || null,
      categoria: input.categoria?.trim() || null,
      comentario: input.comentario?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gastoId)
    .select(selectGasto)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapGasto(data as unknown as GastoRow);
}

export async function eliminarGasto(gasto: Gasto): Promise<void> {
  await asegurarArqueoAbierto(gasto.arqueoCajaId);

  const { error } = await supabase.from("gastos").delete().eq("id", gasto.id);

  if (error) {
    throw new Error(error.message);
  }
}
