import type { Salon } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type SalonRow = {
  id: string;
  nombre: string;
  activo: boolean;
};

function mapSalon(row: SalonRow): Salon {
  return {
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
  };
}

export function normalizarNombreSalon(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export async function obtenerSalones(): Promise<Salon[]> {
  const { data, error } = await supabase
    .from("salones")
    .select("id, nombre, activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSalon);
}

export async function crearSalon(nombre: string): Promise<Salon> {
  const nombreLimpio = nombre.trim().replace(/\s+/g, " ");

  if (!nombreLimpio) {
    throw new Error("Ingresa un nombre para el salon.");
  }

  const { data: existentes, error: existentesError } = await supabase
    .from("salones")
    .select("id, nombre")
    .eq("activo", true);

  if (existentesError) {
    throw new Error(existentesError.message);
  }

  const repetido = (existentes ?? []).some(
    (salon) => normalizarNombreSalon(String(salon.nombre)) === normalizarNombreSalon(nombreLimpio)
  );

  if (repetido) {
    throw new Error("Ya existe un salon con ese nombre.");
  }

  const { data, error } = await supabase
    .from("salones")
    .insert({ nombre: nombreLimpio })
    .select("id, nombre, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un salon con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapSalon(data);
}

export async function actualizarSalon(salonId: string, nombre: string): Promise<Salon> {
  const nombreLimpio = nombre.trim().replace(/\s+/g, " ");

  if (!nombreLimpio) {
    throw new Error("Ingresa un nombre para el salon.");
  }

  const { data: existentes, error: existentesError } = await supabase
    .from("salones")
    .select("id, nombre")
    .eq("activo", true)
    .neq("id", salonId);

  if (existentesError) {
    throw new Error(existentesError.message);
  }

  const repetido = (existentes ?? []).some(
    (salon) => normalizarNombreSalon(String(salon.nombre)) === normalizarNombreSalon(nombreLimpio)
  );

  if (repetido) {
    throw new Error("Ya existe un salon con ese nombre.");
  }

  const { data, error } = await supabase
    .from("salones")
    .update({ nombre: nombreLimpio, updated_at: new Date().toISOString() })
    .eq("id", salonId)
    .select("id, nombre, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un salon con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapSalon(data);
}

export async function desactivarSalon(salonId: string): Promise<void> {
  const { count, error: mesasError } = await supabase
    .from("mesas")
    .select("id", { count: "exact", head: true })
    .eq("sector", salonId);

  if (mesasError) {
    throw new Error(mesasError.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar un salon que tiene mesas. Primero move o elimina sus mesas.");
  }

  const { error } = await supabase
    .from("salones")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", salonId);

  if (error) {
    throw new Error(error.message);
  }
}
