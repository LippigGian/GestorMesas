import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Salon } from "@/lib/types";
import { obtenerSalones } from "@/services/salonesService";

type SectorContextType = {
  sectorActual: string;
  setSectorActual: React.Dispatch<React.SetStateAction<string>>;
  salones: Salon[];
  cargandoSalones: boolean;
  errorSalones: string | null;
  recargarSalones: () => Promise<void>;
};

const SectorContext = createContext<SectorContextType | undefined>(undefined);

export function SectorProvider({ children }: { children: ReactNode }) {
  const [sectorActual, setSectorActual] = useState("salon");
  const [salones, setSalones] = useState<Salon[]>([]);
  const [cargandoSalones, setCargandoSalones] = useState(true);
  const [errorSalones, setErrorSalones] = useState<string | null>(null);

  const recargarSalones = async () => {
    try {
      setCargandoSalones(true);
      setErrorSalones(null);
      const salonesDb = await obtenerSalones();
      setSalones(salonesDb);
      setSectorActual((actual) => {
        if (salonesDb.some((salon) => salon.id === actual)) {
          return actual;
        }

        return salonesDb[0]?.id ?? actual;
      });
    } catch (err) {
      setErrorSalones(err instanceof Error ? err.message : "No se pudieron cargar los salones.");
    } finally {
      setCargandoSalones(false);
    }
  };

  useEffect(() => {
    recargarSalones();
  }, []);

  return (
    <SectorContext.Provider
      value={{
        sectorActual,
        setSectorActual,
        salones,
        cargandoSalones,
        errorSalones,
        recargarSalones,
      }}
    >
      {children}
    </SectorContext.Provider>
  );
}

export function useSector() {
  const context = useContext(SectorContext);
  if (!context) {
    throw new Error("useSector debe usarse dentro de un SectorProvider");
  }
  return context;
}
