import type { Turno } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type TurnoRow = {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
};

function mapTurno(row: TurnoRow): Turno {
  return {
    id: row.id,
    nombre: row.nombre,
    horaInicio: row.hora_inicio.slice(0, 5),
    horaFin: row.hora_fin.slice(0, 5),
    activo: row.activo,
  };
}

export function normalizarNombreTurno(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

export async function obtenerTurnos(): Promise<Turno[]> {
  const { data, error } = await supabase
    .from("turnos")
    .select("id, nombre, hora_inicio, hora_fin, activo")
    .order("hora_inicio");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTurno);
}

export async function crearTurno(input: {
  nombre: string;
  horaInicio: string;
  horaFin: string;
}): Promise<Turno> {
  const nombre = input.nombre.trim();

  if (!nombre) {
    throw new Error("El nombre del turno es obligatorio.");
  }

  const { data, error } = await supabase
    .from("turnos")
    .insert({
      nombre,
      hora_inicio: input.horaInicio,
      hora_fin: input.horaFin,
      activo: true,
    })
    .select("id, nombre, hora_inicio, hora_fin, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un turno con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapTurno(data);
}

export async function actualizarTurno(input: {
  turnoId: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
}): Promise<Turno> {
  const nombre = input.nombre.trim();

  if (!nombre) {
    throw new Error("El nombre del turno es obligatorio.");
  }

  const { data, error } = await supabase
    .from("turnos")
    .update({
      nombre,
      hora_inicio: input.horaInicio,
      hora_fin: input.horaFin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.turnoId)
    .select("id, nombre, hora_inicio, hora_fin, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un turno con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapTurno(data);
}

export async function desactivarTurno(turnoId: string): Promise<void> {
  const { error } = await supabase
    .from("turnos")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", turnoId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function activarTurno(turnoId: string): Promise<void> {
  const { error } = await supabase
    .from("turnos")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", turnoId);

  if (error) {
    throw new Error(error.message);
  }
}
