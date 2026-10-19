import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { crearColaSincronizacion } from "@/lib/colaSincronizacion";

// Supabase reutiliza canales con el mismo nombre: esperar el cierre al navegar.
const canalesEnCierre = new Map<string, Promise<unknown>>();

export function useSincronizacionPedidos(localId: string | undefined, actualizarDatos: (vigente: () => boolean) => Promise<void>) {
  const actualizarRef = useRef(actualizarDatos);
  useLayoutEffect(() => { actualizarRef.current = actualizarDatos; });
  const cola = useRef<ReturnType<typeof crearColaSincronizacion> | null>(null);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localId) return;
    let vigente = true;
    setConectado(false);
    setError("");
    const actualizaciones = crearColaSincronizacion(
      (esVigente) => actualizarRef.current(esVigente),
      () => { if (vigente) setError("No se pudieron actualizar los datos. Reintentá o revisá la conexión."); },
      () => { if (vigente) setError(""); },
    );
    cola.current = actualizaciones;
    actualizaciones.solicitar();
    const tema = `pedidos:${localId}`;
    let canal: ReturnType<typeof supabase.channel> | undefined;
    let conectando = false;
    const conectar = async () => {
      if (conectando || canal || !vigente) return;
      conectando = true;
      try {
        await canalesEnCierre.get(tema);
        await supabase.realtime.setAuth();
        if (!vigente) return;
        canal = supabase.channel(tema, { config: { private: true } })
          .on("broadcast", { event: "pedidos_actualizados" }, () => {
            actualizaciones.solicitar();
          });
        canal.subscribe((estado) => {
          if (!vigente) return;
          setConectado(estado === "SUBSCRIBED");
          // Recuperar cambios ocurridos antes de conectar y durante una desconexión.
          if (estado === "SUBSCRIBED") actualizaciones.solicitar();
        });
      } catch {
        if (vigente) setConectado(false);
      } finally { conectando = false; }
    };
    void conectar();
    const refrescar = () => {
      if (document.visibilityState === "visible") {
        actualizaciones.solicitar();
        void conectar();
      }
    };
    const sinConexion = () => {
      setConectado(false);
      setError("Sin conexión. Los datos se actualizarán al reconectar.");
    };
    window.addEventListener("online", refrescar);
    window.addEventListener("offline", sinConexion);
    window.addEventListener("focus", refrescar);
    document.addEventListener("visibilitychange", refrescar);
    // Respaldo ante eventos perdidos, suspensión del celular o Realtime deshabilitado.
    const timer = window.setInterval(refrescar, 30000);
    return () => {
      vigente = false;
      actualizaciones.destruir();
      if (cola.current === actualizaciones) cola.current = null;
      if (canal) {
        const cierre = supabase.removeChannel(canal).catch(() => {});
        canalesEnCierre.set(tema, cierre);
        void cierre.finally(() => { if (canalesEnCierre.get(tema) === cierre) canalesEnCierre.delete(tema); });
      }
      window.clearInterval(timer);
      window.removeEventListener("online", refrescar);
      window.removeEventListener("offline", sinConexion);
      window.removeEventListener("focus", refrescar);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [localId]);

  const actualizar = useCallback(() => { cola.current?.solicitar(); }, []);
  const ejecutarCambio = useCallback(<T,>(cambio: () => Promise<T>): Promise<T> => {
    return cola.current ? cola.current.ejecutarCambio(cambio) : cambio();
  }, []);
  return { conectado, error, actualizar, ejecutarCambio };
}
