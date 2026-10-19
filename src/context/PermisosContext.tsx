import { createContext, useContext, useEffect, useState } from "react";
import { useLocal } from "@/context/LocalContext";
import { supabase } from "@/lib/supabase";
import { validarPermisos, type Permiso } from "@/lib/permisos";
import { diagnosticoCarga } from "@/lib/diagnosticoCarga";

type Acceso = { administrador: boolean; rol_nombre: string; permisos: Permiso[] };
type Contexto = { administrador: boolean; rolNombre: string; cargando: boolean; error: string | null;
  tiene: (permiso: Permiso) => boolean; recargar: () => void };
const Context = createContext<Contexto | undefined>(undefined);

export function PermisosProvider({ children }: { children: React.ReactNode }) {
  const { localId } = useLocal();
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    let vigente = true;
    let pendiente = false;
    setAcceso(null); setError(null);
    if (!localId) { setCargando(false); return; }
    setCargando(true);
    async function cargar() {
      if (pendiente) return;
      pendiente = true;
      try {
        const { data, error } = await diagnosticoCarga.medir("Verificar permisos", () => supabase.rpc("mis_permisos"));
        if (error) throw new Error(error.message);
        if (!data || data.local_id !== localId || !Array.isArray(data.permisos) || typeof data.administrador !== "boolean") throw new Error("No se pudo verificar tu rol activo en esta cafetería.");
        const acceso = { administrador: data.administrador, rol_nombre: data.rol_nombre, permisos: validarPermisos(data.permisos) };
        if (vigente) { setAcceso(acceso); setError(null); }
      } catch (err) {
        if (vigente) { setAcceso(null); setError(err instanceof Error ? err.message : "No se pudieron cargar los permisos."); }
      } finally { pendiente = false; if (vigente) setCargando(false); }
    }
    void cargar();
    const refrescar = () => { if (document.visibilityState === "visible") void cargar(); };
    window.addEventListener("focus", refrescar);
    document.addEventListener("visibilitychange", refrescar);
    const timer = window.setInterval(refrescar, 60000);
    return () => { vigente = false; window.clearInterval(timer); window.removeEventListener("focus", refrescar); document.removeEventListener("visibilitychange", refrescar); };
  }, [localId, recarga]);
  return <Context.Provider value={{ administrador: acceso?.administrador ?? false, rolNombre: acceso?.rol_nombre ?? "", cargando, error,
    tiene: permiso => Boolean(acceso && (acceso.administrador || acceso.permisos.includes(permiso))), recargar: () => setRecarga(n => n + 1) }}>{children}</Context.Provider>;
}

export function usePermisos() {
  const context = useContext(Context);
  if (!context) throw new Error("Falta PermisosProvider.");
  return context;
}
