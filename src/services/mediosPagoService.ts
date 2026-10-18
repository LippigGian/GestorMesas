import type { MedioPago } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type MedioPagoRow = {
  id: string;
  local_id: string;
  nombre: string;
  activo: boolean;
};

function mapMedioPago(row: MedioPagoRow): MedioPago {
  return {
    id: row.id,
    localId: row.local_id,
    nombre: row.nombre,
    activo: row.activo,
  };
}

export function normalizarNombreMedioPago(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

export async function obtenerMediosPago(localId?: string): Promise<MedioPago[]> {
  let query = supabase
    .from("medios_pago")
    .select("id, local_id, nombre, activo")
    .eq("activo", true)
    .order("nombre");

  if (localId) {
    query = query.eq("local_id", localId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMedioPago);
}

export async function obtenerTodosMediosPago(localId?: string): Promise<MedioPago[]> {
  let query = supabase
    .from("medios_pago")
    .select("id, local_id, nombre, activo")
    .order("nombre");

  if (localId) {
    query = query.eq("local_id", localId);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un medio de pago con ese nombre.");
    }

    throw new Error(error.message);
  }

  return (data ?? []).map(mapMedioPago);
}

export async function crearMedioPago(nombre: string, localId: string): Promise<MedioPago> {
  const nombreNormalizado = nombre.trim();

  if (!nombreNormalizado) {
    throw new Error("El nombre del medio de pago es obligatorio.");
  }

  const { data, error } = await supabase
    .from("medios_pago")
    .insert({ local_id: localId, nombre: nombreNormalizado, activo: true })
    .select("id, local_id, nombre, activo")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMedioPago(data);
}

export async function eliminarMedioPago(medioPagoId: string): Promise<void> {
  const { error } = await supabase
    .from("medios_pago")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", medioPagoId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function activarMedioPago(medioPagoId: string): Promise<void> {
  const { error } = await supabase
    .from("medios_pago")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", medioPagoId);

  if (error) {
    throw new Error(error.message);
  }
}
