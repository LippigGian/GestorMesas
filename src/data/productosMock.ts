import type { Categoria, Producto } from "@/lib/types";

export const categoriasMock: Categoria[] = [
  { id: "1", nombre: "Bebidas" },
  { id: "2", nombre: "Cafeteria" },
];

export const productosMock: Producto[] = [
  { id: "a1", nombre: "Agua con gas", precio: 1900, categoriaId: "1" },
  { id: "a2", nombre: "Pepsi", precio: 1900, categoriaId: "1" },
  { id: "b1", nombre: "Cafe espresso", precio: 2200, categoriaId: "2" },
];
