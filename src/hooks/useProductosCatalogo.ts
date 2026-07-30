import { useEffect, useMemo, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import {
  actualizarProducto,
  crearCategoria,
  crearProducto,
  eliminarCategoria,
  eliminarProducto,
  obtenerCategorias,
  obtenerProductos,
} from "@/services/productosService";
import { useCatalogo } from "@/context/CatalogoContext";

function normalizarNombre(nombre: string) {
  return nombre.trim().toLocaleLowerCase();
}

export function useProductosCatalogo() {
  const { recargarCatalogo } = useCatalogo();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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

  const categoriaActual = useMemo(
    () => categorias.find((categoria) => categoria.id === categoriaSeleccionada),
    [categoriaSeleccionada, categorias]
  );

  const productosEnCategoriaSeleccionada = useMemo(
    () => productos.filter((producto) => producto.categoriaId === categoriaSeleccionada),
    [categoriaSeleccionada, productos]
  );

  const agregarCategoria = async (categoria: Categoria) => {
    const nombreNormalizado = normalizarNombre(categoria.nombre);

    if (!nombreNormalizado) {
      setError("El nombre de la categoria es obligatorio.");
      return;
    }

    const categoriaExistente = categorias.some(
      (categoriaActual) => normalizarNombre(categoriaActual.nombre) === nombreNormalizado
    );

    if (categoriaExistente) {
      setError("Ya existe una categoria con ese nombre.");
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      const categoriaCreada = await crearCategoria({
        ...categoria,
        nombre: categoria.nombre.trim(),
      });

      setCategorias((prev) => [...prev, categoriaCreada]);
      setCategoriaSeleccionada(categoriaCreada.id);
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoria");
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const agregarProducto = async (producto: Producto) => {
    const nombreNormalizado = normalizarNombre(producto.nombre);

    if (!nombreNormalizado) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    const productoExistente = productos.some(
      (productoActual) =>
        productoActual.categoriaId === producto.categoriaId &&
        normalizarNombre(productoActual.nombre) === nombreNormalizado
    );

    if (productoExistente) {
      throw new Error("Ya existe un producto con ese nombre en esta categoria.");
    }

    try {
      setGuardando(true);
      setError(null);
      const productoCreado = await crearProducto({
        ...producto,
        nombre: producto.nombre.trim(),
      });

      setProductos((prev) => [...prev, productoCreado]);
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el producto");
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const borrarCategoriaSeleccionada = async () => {
    if (!categoriaActual) {
      return;
    }

    if (productosEnCategoriaSeleccionada.length > 0) {
      setError("No se puede eliminar una categoria que tiene productos asociados.");
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      await eliminarCategoria(categoriaActual.id);

      const categoriasActualizadas = categorias.filter((categoria) => categoria.id !== categoriaActual.id);

      setCategorias(categoriasActualizadas);
      setCategoriaSeleccionada(categoriasActualizadas[0]?.id ?? "");
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la categoria");
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const editarProducto = async (producto: Producto) => {
    const nombreNormalizado = normalizarNombre(producto.nombre);

    if (!nombreNormalizado) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    const productoExistente = productos.some(
      (productoActual) =>
        productoActual.id !== producto.id &&
        productoActual.categoriaId === producto.categoriaId &&
        normalizarNombre(productoActual.nombre) === nombreNormalizado
    );

    if (productoExistente) {
      throw new Error("Ya existe un producto con ese nombre en esta categoria.");
    }

    try {
      setGuardando(true);
      setError(null);

      const productoEditado = await actualizarProducto({
        ...producto,
        nombre: producto.nombre.trim(),
      });

      setProductos((prev) =>
        prev.map((productoActual) =>
          productoActual.id === productoEditado.id ? productoEditado : productoActual
        )
      );
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar el producto");
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const borrarProducto = async (producto: Producto) => {
    try {
      setGuardando(true);
      setError(null);

      await eliminarProducto(producto.id);

      setProductos((prev) => prev.filter((productoActual) => productoActual.id !== producto.id));
      await recargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el producto");
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  return {
    agregarCategoria,
    agregarProducto,
    borrarProducto,
    busqueda,
    cargando,
    borrarCategoriaSeleccionada,
    categorias,
    categoriaActual,
    categoriaSeleccionada,
    editarProducto,
    error,
    guardando,
    productos,
    productosEnCategoriaSeleccionada,
    productosFiltrados,
    setBusqueda,
    setCategoriaSeleccionada,
  };
}
