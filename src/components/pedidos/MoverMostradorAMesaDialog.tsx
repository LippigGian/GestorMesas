import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { obtenerMesas, type MesaConPosicion } from "@/services/mesasService";
import { useSector } from "@/context/SectorContext";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (mesaId: string, personas: number) => Promise<void>;
};

export function MoverMostradorAMesaDialog({ open, onOpenChange, onConfirmar }: Props) {
  const { salones } = useSector();
  const [mesas, setMesas] = useState<MesaConPosicion[]>([]);
  const [mesaId, setMesaId] = useState("");
  const [personas, setPersonas] = useState("1");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!open) return;
    let vigente = true;
    setMesaId("");
    setPersonas("1");
    setError("");
    setMesas([]);
    setCargando(true);
    obtenerMesas().then((data) => {
      if (vigente) setMesas(data
        .filter((mesa) => mesa.estado === "libre")
        .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true })));
    }).catch((err) => {
      if (vigente) setError(err instanceof Error ? err.message : "No se pudieron cargar las mesas.");
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [open, recarga]);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!guardando) onOpenChange(value); }}>
      <DialogContent showCloseButton={!guardando}>
        <DialogHeader>
          <DialogTitle>Mover pedido a mesa</DialogTitle>
          <DialogDescription>Elegí una mesa libre. Se conservarán los productos y cobros del pedido.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (guardando) return;
          const cantidad = Number(personas);
          if (!mesas.some((mesa) => mesa.id === mesaId) || !Number.isInteger(cantidad) || cantidad < 1) {
            setError("Seleccioná una mesa e ingresá una cantidad entera de personas mayor a cero.");
            return;
          }
          setGuardando(true);
          setError("");
          try {
            await onConfirmar(mesaId, cantidad);
            onOpenChange(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo mover el pedido.");
          } finally { setGuardando(false); }
        }}>
          <div>
            <label htmlFor="mesa-destino-mostrador" className="mb-1 block text-sm font-medium">Mesa de destino</label>
            <select id="mesa-destino-mostrador" className="h-10 w-full rounded-md border bg-card px-3 text-sm"
              value={mesaId} required disabled={cargando || guardando} onChange={(e) => setMesaId(e.target.value)}>
              <option value="">{cargando ? "Cargando mesas…" : "Seleccioná una mesa"}</option>
              {mesas.map((mesa) => <option key={mesa.id} value={mesa.id}>
                Mesa {mesa.numero} · {salones.find((salon) => salon.id === mesa.sector)?.nombre ?? mesa.sector}
              </option>)}
            </select>
            {!cargando && mesas.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No hay mesas libres disponibles.</p>}
          </div>
          <div>
            <label htmlFor="personas-mostrador" className="mb-1 block text-sm font-medium">Cantidad de personas</label>
            <Input id="personas-mostrador" type="number" min={1} max={2147483647} step={1} required
              value={personas} disabled={guardando} onChange={(e) => setPersonas(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={cargando || guardando} onClick={() => setRecarga((n) => n + 1)}>Actualizar mesas</Button>
            <Button type="button" variant="outline" disabled={guardando} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={cargando || guardando || !mesaId}>{guardando ? "Moviendo…" : "Mover a mesa"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
