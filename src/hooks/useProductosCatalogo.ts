import { useEffect, useMemo, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import {
  crearCategoria,
  crearProducto,
  obtenerCategorias,
  obtenerProductos,
} from "@/services/productosService";

export function useProductosCatalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarCatalogo() {
      try {
        setCargando(true);
        setError(null);

        const [categoriasDb, productosDb] = await Promise.all([
          obtenerCategorias(),
          obtenerProductos(),
        ]);

        if (!mounted) {
          return;
        }

        setCategorias(categoriasDb);
        setProductos(productosDb);
        setCategoriaSeleccionada((prev) => prev || categoriasDb[0]?.id || "");
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(err instanceof Error ? err.message : "No se pudo cargar el catalogo");
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    cargarCatalogo();

    return () => {
      mounted = false;
    };
  }, []);

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.categoriaId === categoriaSeleccionada &&
          producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [busqueda, categoriaSeleccionada, productos]
  );

  const agregarCategoria = async (categoria: Categoria) => {
    try {
      setError(null);
      const categoriaCreada = await crearCategoria(categoria);

      setCategorias((prev) => [...prev, categoriaCreada]);
      setCategoriaSeleccionada(categoriaCreada.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoria");
      throw err;
    }
  };

  const agregarProducto = async (producto: Producto) => {
    try {
      setError(null);
      const productoCreado = await crearProducto(producto);

      setProductos((prev) => [...prev, productoCreado]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el producto");
      throw err;
    }
  };

  return {
    agregarCategoria,
    agregarProducto,
    busqueda,
    cargando,
    categorias,
    categoriaSeleccionada,
    error,
    productos,
    productosFiltrados,
    setBusqueda,
    setCategoriaSeleccionada,
  };
}
