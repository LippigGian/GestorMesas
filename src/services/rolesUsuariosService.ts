import { validarPermisos } from "@/lib/permisos";
import type { RolUsuario } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type RolUsuarioRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  permisos: string[] | null;
  activo: boolean;
};

function mapRolUsuario(row: RolUsuarioRow): RolUsuario {
  return {
    id: row.id,
    // Compatibilidad con los roles guardados antes del cambio de nombre.
    nombre: nombreVisibleRolUsuario(row.nombre),
    descripcion: row.descripcion ?? undefined,
    permisos: row.permisos ?? [],
    activo: row.activo,
  };
}

export function nombreVisibleRolUsuario(nombre: string) {
  return normalizarNombreRolUsuario(nombre) === "mozo" ? "Camarero" : nombre;
}

export function normalizarNombreRolUsuario(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

export function validarNombreRolUsuario(nombre: string) {
  const limpio = nombre.trim();

  if (!limpio) {
    throw new Error("El nombre del rol es obligatorio.");
  }

  if (!/^[a-zA-Z0-9À-ÿñÑ\s.'-]+$/.test(limpio)) {
    throw new Error("El rol solo puede tener letras, numeros, espacios, punto, apostrofe o guion.");
  }

  return limpio;
}

export function validarDescripcionRolUsuario(descripcion: string) {
  const limpio = descripcion.trim();

  if (limpio.length > 240) {
    throw new Error("La descripcion no puede superar los 240 caracteres.");
  }

  return limpio;
}

export async function obtenerRolesUsuarios(): Promise<RolUsuario[]> {
  const { data, error } = await supabase
    .from("roles_usuarios")
    .select("id, nombre, descripcion, permisos, activo")
    .order("nombre");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRolUsuario(row as RolUsuarioRow));
}

export async function crearRolUsuario(input: {
  nombre: string;
  descripcion?: string;
  permisos?: string[];
}): Promise<RolUsuario> {
  const nombre = validarNombreRolUsuario(input.nombre);
  const descripcion = validarDescripcionRolUsuario(input.descripcion ?? "");

  const { data, error } = await supabase
    .from("roles_usuarios")
    .insert({
      nombre,
      descripcion: descripcion || null,
      permisos: validarPermisos(input.permisos ?? []),
      activo: true,
    })
    .select("id, nombre, descripcion, permisos, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un rol con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapRolUsuario(data as RolUsuarioRow);
}

export async function actualizarRolUsuario(input: {
  rolId: string;
  nombre: string;
  descripcion?: string;
  permisos?: string[];
}): Promise<RolUsuario> {
  const nombre = validarNombreRolUsuario(input.nombre);
  const descripcion = validarDescripcionRolUsuario(input.descripcion ?? "");

  const { data, error } = await supabase
    .from("roles_usuarios")
    .update({
      nombre,
      descripcion: descripcion || null,
      permisos: validarPermisos(input.permisos ?? []),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.rolId)
    .select("id, nombre, descripcion, permisos, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un rol con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapRolUsuario(data as RolUsuarioRow);
}

export async function desactivarRolUsuario(rolId: string): Promise<void> {
  const { error } = await supabase
    .from("roles_usuarios")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", rolId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function activarRolUsuario(rolId: string): Promise<void> {
  const { error } = await supabase
    .from("roles_usuarios")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", rolId);

  if (error) {
    throw new Error(error.message);
  }
}
