import { MesaGrid } from "@/components/mesa/MesaGrid";
import { useSector } from "@/context/SectorContext";

type MesaManagerProps = {
  modoEdicion: boolean;
};

export default function MesaManager({ modoEdicion }: MesaManagerProps) {
  const { sectorActual, salones } = useSector();

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
      </div>

      <MesaGrid
        modoEdicion={modoEdicion}
        sectorActual={sectorActual}
        sectores={salones.map((salon) => salon.id)}
      />
    </main>
  );
}
