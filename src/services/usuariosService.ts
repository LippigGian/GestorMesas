import type { UsuarioSistema } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type UsuarioSistemaRow = {
  id: string;
  nombre: string;
  email: string;
  rol_id: string | null;
  activo: boolean;
  roles_usuarios?: { nombre: string } | { nombre: string }[] | null;
};

function obtenerRelacion<T>(relacion: T | T[] | null | undefined): T | undefined {
  return Array.isArray(relacion) ? relacion[0] : relacion ?? undefined;
}

function mapUsuario(row: UsuarioSistemaRow): UsuarioSistema {
  const rol = obtenerRelacion(row.roles_usuarios);

  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rolId: row.rol_id ?? undefined,
    rolNombre: rol?.nombre,
    activo: row.activo,
  };
}

export function normalizarEmailUsuario(email: string) {
  return email.trim().toLocaleLowerCase();
}

export function normalizarNombreUsuario(nombre: string) {
  return nombre.trim().replace(/\s+/g, " ");
}

export function validarNombreUsuario(nombre: string) {
  const limpio = normalizarNombreUsuario(nombre);

  if (!limpio) {
    throw new Error("El nombre del usuario es obligatorio.");
  }

  if (!/^[a-zA-ZÀ-ÿñÑ\s.'-]+$/.test(limpio)) {
    throw new Error("El nombre solo puede tener letras, espacios, punto, apostrofe o guion.");
  }

  return limpio;
}

export function validarEmailUsuario(email: string) {
  const limpio = normalizarEmailUsuario(email);

  if (!limpio) {
    throw new Error("El email del usuario es obligatorio.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
    throw new Error("Ingresa un email valido.");
  }

  return limpio;
}

export async function obtenerUsuariosSistema(): Promise<UsuarioSistema[]> {
  const { data, error } = await supabase
    .from("usuarios_sistema")
    .select("id, nombre, email, rol_id, activo, roles_usuarios(nombre)")
    .order("nombre");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapUsuario(row as UsuarioSistemaRow));
}

export async function crearUsuarioSistema(input: {
  nombre: string;
  email: string;
  rolId?: string;
}): Promise<UsuarioSistema> {
  const nombre = validarNombreUsuario(input.nombre);
  const email = validarEmailUsuario(input.email);

  const { data, error } = await supabase
    .from("usuarios_sistema")
    .insert({
      nombre,
      email,
      rol_id: input.rolId || null,
      activo: true,
    })
    .select("id, nombre, email, rol_id, activo, roles_usuarios(nombre)")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un usuario con ese email.");
    }

    throw new Error(error.message);
  }

  return mapUsuario(data as UsuarioSistemaRow);
}

export async function actualizarUsuarioSistema(input: {
  usuarioId: string;
  nombre: string;
  email: string;
  rolId?: string;
}): Promise<UsuarioSistema> {
  const nombre = validarNombreUsuario(input.nombre);
  const email = validarEmailUsuario(input.email);

  const { data, error } = await supabase
    .from("usuarios_sistema")
    .update({
      nombre,
      email,
      rol_id: input.rolId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.usuarioId)
    .select("id, nombre, email, rol_id, activo, roles_usuarios(nombre)")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un usuario con ese email.");
    }

    throw new Error(error.message);
  }

  return mapUsuario(data as UsuarioSistemaRow);
}

export async function desactivarUsuarioSistema(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("usuarios_sistema")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", usuarioId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function activarUsuarioSistema(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("usuarios_sistema")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", usuarioId);

  if (error) {
    throw new Error(error.message);
  }
}
