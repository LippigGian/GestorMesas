import { useEffect, useState } from "react";
import { useLocal } from "@/context/LocalContext";
import { supabase } from "@/lib/supabase";

export function IndicadorEstadoCaja({ revision }: { revision: number }) {
  const { localId } = useLocal();
  const [estado, setEstado] = useState<"cargando" | "abierto" | "cerrado" | "error">("cargando");
  useEffect(() => {
    let vigente = true;
    let pendiente = false;
    setEstado("cargando");
    if (!localId) return;
    async function cargar() {
      if (pendiente) return;
      pendiente = true;
      try {
        const { data, error } = await supabase.rpc("listar_arqueos_operativos")
          .select("id").eq("estado", "abierto").limit(1);
        if (error) throw error;
        if (vigente) setEstado(Array.isArray(data) && data.length ? "abierto" : "cerrado");
      } catch {
        if (vigente) setEstado("error");
      } finally { pendiente = false; }
    }
    void cargar();
    const refrescar = () => { if (document.visibilityState === "visible") void cargar(); };
    window.addEventListener("focus", refrescar);
    document.addEventListener("visibilitychange", refrescar);
    const timer = window.setInterval(refrescar, 60000);
    return () => {
      vigente = false;
      clearInterval(timer);
      window.removeEventListener("focus", refrescar);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [localId, revision]);
  return <span role="status" aria-label="Estado de caja"
    className={`rounded-full px-3 py-1 text-xs font-semibold ${estado === "abierto" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
    {estado === "cargando" ? "Consultando caja…" : estado === "error" ? "Estado no disponible" : estado === "abierto" ? "Abierto" : "Cerrado"}
  </span>;
}
