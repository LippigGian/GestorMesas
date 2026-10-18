import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "gestor-mesas.configuracion-general.nombre-negocio";
const DEFAULT_NAME = "Estación de café";

function leerNombre() {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

const ConfiguracionGeneralContext = createContext<{
  nombreNegocio: string;
  guardarNombreNegocio: (nombre: string) => void;
} | null>(null);

export function ConfiguracionGeneralProvider({ children }: { children: ReactNode }) {
  const [nombreNegocio, setNombreNegocio] = useState(leerNombre);

  const guardarNombreNegocio = (nombre: string) => {
    const normalizado = nombre.trim().replace(/\s+/g, " ");
    if (!normalizado || normalizado.length > 60) {
      throw new Error("Ingresá un nombre de entre 1 y 60 caracteres.");
    }
    try {
      localStorage.setItem(STORAGE_KEY, normalizado);
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
