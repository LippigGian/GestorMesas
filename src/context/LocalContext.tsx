import { createContext, useContext, useEffect, useState } from "react";
import type { Local } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { obtenerLocalDelUsuario } from "@/services/localesService";

type LocalContextType = {
  local: Local | null;
  localId: string | null;
  cargandoLocal: boolean;
  errorLocal: string | null;
};

const LocalContext = createContext<LocalContextType | undefined>(undefined);

export function LocalProvider({ children }: { children: React.ReactNode }) {
  const { cargandoAuth, user } = useAuth();
  const [local, setLocal] = useState<Local | null>(null);
  const [cargandoLocal, setCargandoLocal] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarLocal() {
      if (cargandoAuth) return;

      if (!user) {
        setLocal(null);
        setErrorLocal(null);
        setCargandoLocal(false);
        return;
      }

      try {
        setCargandoLocal(true);
        setErrorLocal(null);
        const localActivo = await obtenerLocalDelUsuario(user.id);

        if (!mounted) return;

        setLocal(localActivo);
        if (!localActivo) {
          setErrorLocal("Tu usuario no tiene ningun local activo asociado.");
        }
      } catch (err) {
        if (mounted) {
          setErrorLocal(err instanceof Error ? err.message : "No se pudo cargar el local.");
        }
      } finally {
        if (mounted) {
          setCargandoLocal(false);
        }
      }
    }

    cargarLocal();

    return () => {
      mounted = false;
    };
  }, [cargandoAuth, user]);

  return (
    <LocalContext.Provider
      value={{
        local,
        localId: local?.id ?? null,
        cargandoLocal,
        errorLocal,
      }}
    >
      {children}
    </LocalContext.Provider>
  );
}

export function useLocal() {
  const context = useContext(LocalContext);

  if (!context) {
    throw new Error("useLocal debe usarse dentro de LocalProvider");
  }

  return context;
}
