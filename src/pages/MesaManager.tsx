import { MesaGrid } from "@/components/mesa/MesaGrid";
import { useSector } from "@/context/SectorContext";

type MesaManagerProps = {
  modoEdicion: boolean;
};

export default function MesaManager({ modoEdicion }: MesaManagerProps) {
  const { sectorActual } = useSector();

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion de Mesas</h1>
      </div>

      <MesaGrid modoEdicion={modoEdicion} sectorActual={sectorActual} />
    </main>
  );
}
