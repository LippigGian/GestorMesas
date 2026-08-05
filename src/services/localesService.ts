import type { Local } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type LocalRow = {
  id: string;
  nombre: string;
  activo: boolean;
};

function mapLocal(row: LocalRow): Local {
  return {
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
  };
}

export async function obtenerLocalActivo(): Promise<Local | null> {
  const { data, error } = await supabase
    .from("locales")
    .select("id, nombre, activo")
    .eq("activo", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapLocal(data) : null;
}

type UsuarioLocalRow = {
  local_id: string;
  rol: string;
  activo: boolean;
  locales: LocalRow | LocalRow[] | null;
};

export async function obtenerLocalDelUsuario(usuarioId: string): Promise<Local | null> {
  const { data, error } = await supabase
    .from("usuarios_locales")
    .select("local_id, rol, activo, locales(id, nombre, activo)")
    .eq("user_id", usuarioId)
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as UsuarioLocalRow;
  const local = Array.isArray(row.locales) ? row.locales[0] : row.locales;

  if (!local || !local.activo) {
    return null;
  }

  return mapLocal(local);
}
