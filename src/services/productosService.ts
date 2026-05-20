import { categoriasMock, productosMock } from "@/data/productosMock";
import type { Categoria, Producto } from "@/lib/types";

export function obtenerCategorias(): Categoria[] {
  return [...categoriasMock];
}

export function obtenerProductos(): Producto[] {
  return [...productosMock];
}
