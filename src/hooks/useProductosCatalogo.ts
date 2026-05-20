import { useMemo, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import { obtenerCategorias, obtenerProductos } from "@/services/productosService";

export function useProductosCatalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>(() => obtenerCategorias());
  const [productos, setProductos] = useState<Producto[]>(() => obtenerProductos());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(
    () => obtenerCategorias()[0]?.id ?? ""
  );
  const [busqueda, setBusqueda] = useState("");

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.categoriaId === categoriaSeleccionada &&
          producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [busqueda, categoriaSeleccionada, productos]
  );

  const agregarCategoria = (categoria: Categoria) => {
    setCategorias((prev) => [...prev, categoria]);
    setCategoriaSeleccionada(categoria.id);
  };

  const agregarProducto = (producto: Producto) => {
    setProductos((prev) => [...prev, producto]);
  };

  return {
    agregarCategoria,
    agregarProducto,
    busqueda,
    categorias,
    categoriaSeleccionada,
    productos,
    productosFiltrados,
    setBusqueda,
    setCategoriaSeleccionada,
  };
}
