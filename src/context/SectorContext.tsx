import { createContext, useContext, useState, ReactNode } from "react";

type Sector = 'salon' | 'deck';

type SectorContextType = {
  sectorActual: Sector;
  setSectorActual: React.Dispatch<React.SetStateAction<Sector>>;
};

const SectorContext = createContext<SectorContextType | undefined>(undefined);

export function SectorProvider({ children }: { children: ReactNode }) {
  const [sectorActual, setSectorActual] = useState<Sector>('salon');

  return (
    <SectorContext.Provider value={{ sectorActual, setSectorActual }}>
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
