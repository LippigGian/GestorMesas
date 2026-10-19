import { MesaGrid } from "@/components/mesa/MesaGrid";
import { usePermisos } from "@/context/PermisosContext";
import { useSector } from "@/context/SectorContext";

type MesaManagerProps = {
  modoEdicion: boolean;
};

export default function MesaManager({ modoEdicion }: MesaManagerProps) {
  const { tiene } = usePermisos();
  const { sectorActual, salones } = useSector();

  return (
    <main className="mesas-spa-main">
      <MesaGrid
        modoEdicion={modoEdicion && tiene("editar_mesas")}
        sectorActual={sectorActual}
        salones={salones}
      />
    </main>
  );
}
