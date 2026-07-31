import type { Proveedor } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type ProveedorRow = {
  id: string;
  nombre: string;
  activo: boolean;
};

function mapProveedor(row: ProveedorRow): Proveedor {
  return {
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
  };
}

export function normalizarNombreProveedor(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

export function validarNombreProveedor(nombre: string) {
  const limpio = nombre.trim();

  if (!limpio) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  if (!/^[a-zA-Z0-9À-ÿñÑ\s.'-]+$/.test(limpio)) {
    throw new Error("El proveedor solo puede tener letras, numeros, espacios, punto, apostrofe o guion.");
  }

  return limpio;
}

export async function obtenerProveedores(): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, activo")
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapProveedor);
}

export async function obtenerTodosProveedores(): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, activo")
    .order("nombre");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapProveedor);
}

export async function crearProveedor(nombre: string): Promise<Proveedor> {
  const nombreValidado = validarNombreProveedor(nombre);

  const { data, error } = await supabase
    .from("proveedores")
    .insert({ nombre: nombreValidado, activo: true })
    .select("id, nombre, activo")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un proveedor con ese nombre.");
    }

    throw new Error(error.message);
  }

  return mapProveedor(data);
}

export async function eliminarProveedor(proveedorId: string): Promise<void> {
  const { error } = await supabase
    .from("proveedores")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", proveedorId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function activarProveedor(proveedorId: string): Promise<void> {
  const { error } = await supabase
    .from("proveedores")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", proveedorId);

  if (error) {
    throw new Error(error.message);
  }
}
