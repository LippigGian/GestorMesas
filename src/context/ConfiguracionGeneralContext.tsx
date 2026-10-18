import { createContext, useContext, useState, type ReactNode } from "react";

import { useLocal } from "@/context/LocalContext";

const STORAGE_KEY = "gestor-mesas.configuracion-general.nombre-negocio";
const DEFAULT_NAME = "Estación de café";

function leerNombre(storageKey: string, fallback: string) {
  try {
    return localStorage.getItem(storageKey)?.trim() || fallback;
  } catch {
    return fallback;
  }
}

const ConfiguracionGeneralContext = createContext<{
  nombreNegocio: string;
  guardarNombreNegocio: (nombre: string) => void;
} | null>(null);

export function ConfiguracionGeneralProvider({ children }: { children: ReactNode }) {
  const { local } = useLocal();
  return <ConfiguracionDelLocal key={local?.id ?? "sin-local"} storageKey={`${STORAGE_KEY}.${local?.id ?? "sin-local"}`} nombreInicial={local?.nombre ?? DEFAULT_NAME}>{children}</ConfiguracionDelLocal>;
}

function ConfiguracionDelLocal({ children, storageKey, nombreInicial }: { children: ReactNode; storageKey: string; nombreInicial: string }) {
  const [nombreNegocio, setNombreNegocio] = useState(() => leerNombre(storageKey, nombreInicial));

  const guardarNombreNegocio = (nombre: string) => {
    const normalizado = nombre.trim().replace(/\s+/g, " ");
    if (!normalizado || normalizado.length > 60) {
      throw new Error("Ingresá un nombre de entre 1 y 60 caracteres.");
    }
    try {
      localStorage.setItem(storageKey, normalizado);
    } catch {
      throw new Error("No se pudo guardar. Verificá que el navegador permita el almacenamiento local.");
    }
    setNombreNegocio(normalizado);
  };

  return (
    <ConfiguracionGeneralContext.Provider value={{ nombreNegocio, guardarNombreNegocio }}>
      {children}
    </ConfiguracionGeneralContext.Provider>
  );
}

export function useConfiguracionGeneral() {
  const context = useContext(ConfiguracionGeneralContext);
  if (!context) throw new Error("Falta ConfiguracionGeneralProvider.");
  return context;
}
