import type { Categoria, Producto } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type CategoriaRow = {
  id: string;
  nombre: string;
};

type ProductoRow = {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  costo: number | null;
  activo: boolean;
  favorito: boolean;
  controla_stock: boolean;
  stock: number | null;
};

function mapCategoria(row: CategoriaRow): Categoria {
  return {
    id: row.id,
    nombre: row.nombre,
  };
}

function mapProducto(row: ProductoRow): Producto {
  return {
    id: row.id,
    nombre: row.nombre,
    precio: Number(row.precio),
    categoriaId: row.categoria_id,
    descripcion: row.descripcion ?? undefined,
    costo: row.costo === null ? undefined : Number(row.costo),
    activo: row.activo,
    favorito: row.favorito,
    controlaStock: row.controla_stock,
    stock: row.stock === null ? undefined : Number(row.stock),
  };
}

export async function obtenerCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categorias").select("id, nombre").order("nombre");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCategoria);
}

export async function obtenerProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("id, categoria_id, nombre, descripcion, precio, costo, activo, favorito, controla_stock, stock")
    .order("nombre");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapProducto);
}

export async function crearCategoria(categoria: Categoria): Promise<Categoria> {
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nombre: categoria.nombre })
    .select("id, nombre")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCategoria(data);
}

export async function crearProducto(producto: Producto): Promise<Producto> {
  const { data, error } = await supabase
    .from("productos")
    .insert({
      categoria_id: producto.categoriaId,
      nombre: producto.nombre,
      precio: producto.precio,
      descripcion: producto.descripcion ?? null,
      costo: producto.costo ?? null,
      activo: producto.activo ?? true,
      favorito: producto.favorito ?? false,
      controla_stock: producto.controlaStock ?? false,
      stock: producto.stock ?? null,
    })
    .select("id, categoria_id, nombre, descripcion, precio, costo, activo, favorito, controla_stock, stock")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProducto(data);
}

export async function actualizarProducto(producto: Producto): Promise<Producto> {
  const { data, error } = await supabase
    .from("productos")
    .update({
      categoria_id: producto.categoriaId,
      nombre: producto.nombre,
      precio: producto.precio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", producto.id)
    .select("id, categoria_id, nombre, descripcion, precio, costo, activo, favorito, controla_stock, stock")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProducto(data);
}

export async function eliminarProducto(productoId: string): Promise<void> {
  const { error } = await supabase.from("productos").delete().eq("id", productoId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function eliminarCategoria(categoriaId: string): Promise<void> {
  const { error } = await supabase.from("categorias").delete().eq("id", categoriaId);

  if (error) {
    throw new Error(error.message);
  }
}
