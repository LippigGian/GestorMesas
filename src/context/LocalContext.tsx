import { createContext, useContext, useEffect, useState } from "react";
import type { Local } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { obtenerLocalDelUsuario } from "@/services/localesService";
import { diagnosticoCarga } from "@/lib/diagnosticoCarga";

type LocalContextType = {
  local: Local | null;
  localId: string | null;
  cargandoLocal: boolean;
  errorLocal: string | null;
};

const LocalContext = createContext<LocalContextType | undefined>(undefined);

export function LocalProvider({ children }: { children: React.ReactNode }) {
  const { cargandoAuth, user } = useAuth();
  // Cambiar de cuenta desmonta el catálogo y las pantallas de la anterior.
  return <LocalDelUsuarioProvider key={user?.id ?? "sin-sesion"} usuarioId={user?.id ?? null} cargandoAuth={cargandoAuth}>{children}</LocalDelUsuarioProvider>;
}

function LocalDelUsuarioProvider({ children, usuarioId, cargandoAuth }: {
  children: React.ReactNode;
  usuarioId: string | null;
  cargandoAuth: boolean;
}) {
  const [local, setLocal] = useState<Local | null>(null);
  const [cargandoLocal, setCargandoLocal] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarLocal() {
      if (cargandoAuth) return;

      if (!usuarioId) {
        setLocal(null);
        setErrorLocal(null);
        setCargandoLocal(false);
        return;
      }

      try {
        setCargandoLocal(true);
        setErrorLocal(null);
        const localActivo = await diagnosticoCarga.medir("Cargar cafetería", () => obtenerLocalDelUsuario(usuarioId));

        if (!mounted) return;

        setLocal(localActivo);
        if (!localActivo) {
          setErrorLocal("Tu usuario no tiene ningun local activo asociado.");
        }
      } catch (err) {
        if (mounted) {
          setLocal(null);
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
  }, [cargandoAuth, usuarioId]);

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
