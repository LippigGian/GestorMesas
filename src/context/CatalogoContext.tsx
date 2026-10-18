import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import { obtenerCategorias, obtenerProductos } from "@/services/productosService";
import { useLocal } from "@/context/LocalContext";

type CatalogoContextValue = {
  categorias: Categoria[];
  error: string | null;
  productos: Producto[];
  productosActivos: Producto[];
  recargarCatalogo: () => Promise<void>;
  cargando: boolean;
};

const CatalogoContext = createContext<CatalogoContextValue | undefined>(undefined);

export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const { cargandoLocal, errorLocal, localId } = useLocal();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos]
  );

  const recargarCatalogo = async () => {
    if (cargandoLocal) return;

    if (!localId) {
      setCategorias([]);
      setProductos([]);
      setCargando(false);
      setError(errorLocal ?? "No hay un local activo configurado.");
      return;
    }

    try {
      setCargando(true);
      setError(null);

      const [categoriasDb, productosDb] = await Promise.all([
        obtenerCategorias(localId),
        obtenerProductos(localId),
      ]);

      setCategorias(categoriasDb);
      setProductos(productosDb);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el catalogo");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    recargarCatalogo();
  }, [cargandoLocal, errorLocal, localId]);

  return (
    <CatalogoContext.Provider
      value={{
        categorias,
        error,
        productos,
        productosActivos,
        recargarCatalogo,
        cargando,
      }}
    >
      {children}
    </CatalogoContext.Provider>
  );
}

export function useCatalogo() {
  const context = useContext(CatalogoContext);

  if (!context) {
    throw new Error("useCatalogo debe usarse dentro de CatalogoProvider");
  }

  return context;
}
