import type { Caja } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type CajaRow = {
  id: string;
  local_id: string | null;
  nombre: string;
  activo: boolean;
};

function mapCaja(row: CajaRow): Caja {
  return {
    id: row.id,
    localId: row.local_id ?? undefined,
    nombre: row.nombre,
    activo: row.activo,
  };
}

export function normalizarNombreCaja(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

export async function obtenerCajas(localId?: string): Promise<Caja[]> {
  let query = supabase
    .from("cajas")
    .select("id, local_id, nombre, activo")
    .order("nombre");

  if (localId) {
    query = query.eq("local_id", localId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCaja);
}

export async function crearCaja(nombre: string, localId: string): Promise<Caja> {
  const nombreNormalizado = nombre.trim();

  if (!nombreNormalizado) {
    throw new Error("El nombre de la caja es obligatorio.");
  }

  const { data, error } = await supabase
    .from("cajas")
    .insert({ local_id: localId, nombre: nombreNormalizado, activo: true })
    .select("id, local_id, nombre, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe una caja con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapCaja(data);
}

export async function actualizarCaja(cajaId: string, nombre: string): Promise<Caja> {
  const nombreNormalizado = nombre.trim();

  if (!nombreNormalizado) {
    throw new Error("El nombre de la caja es obligatorio.");
  }

  const { data, error } = await supabase
    .from("cajas")
    .update({ nombre: nombreNormalizado, updated_at: new Date().toISOString() })
    .eq("id", cajaId)
    .select("id, local_id, nombre, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe una caja con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapCaja(data);
}

export async function desactivarCaja(cajaId: string): Promise<void> {
  const { error } = await supabase
    .from("cajas")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", cajaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function activarCaja(cajaId: string): Promise<void> {
  const { error } = await supabase
    .from("cajas")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", cajaId);

  if (error) {
    throw new Error(error.message);
  }
}
