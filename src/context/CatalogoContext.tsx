import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import { obtenerCategorias, obtenerProductos } from "@/services/productosService";

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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos]
  );

  const recargarCatalogo = async () => {
    try {
      setCargando(true);
      setError(null);

      const [categoriasDb, productosDb] = await Promise.all([
        obtenerCategorias(),
        obtenerProductos(),
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
  }, []);

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
