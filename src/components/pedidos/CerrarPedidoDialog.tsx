import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MedioPago, PedidoItem } from "@/lib/types";
import { obtenerMediosPago } from "@/services/mediosPagoService";
import type { PagoPedidoInput } from "@/services/pedidosService";

type Props = {
  open: boolean;
  titulo: string;
  total: number;
  items: PedidoItem[];
  onClose: () => void;
  onConfirmar: (pagos: PagoPedidoInput[]) => Promise<void> | void;
};

export function CerrarPedidoDialog({ open, titulo, total, items, onClose, onConfirmar }: Props) {
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [medioPagoId, setMedioPagoId] = useState("");
  const [monto, setMonto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const montoNumerico = Number(monto);
  const montoValido = Number.isFinite(montoNumerico) ? montoNumerico : 0;
  const vuelto = Math.max(0, montoValido - total);
  const faltante = Math.max(0, total - montoValido);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function cargarMediosPago() {
      try {
        setCargando(true);
        setError(null);
        setMonto(String(total));
        const medios = await obtenerMediosPago();

        if (!mounted) return;

        setMediosPago(medios);
        setMedioPagoId(medios[0]?.id ?? "");
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los medios de pago");
        }
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    cargarMediosPago();

    return () => {
      mounted = false;
    };
  }, [open, total]);

  const confirmar = async () => {
    if (!medioPagoId) {
      setError("Selecciona un medio de pago.");
      return;
    }

    if (montoValido < total) {
      setError("El monto pagado no puede ser menor al total.");
      return;
    }

    try {
      setConfirmando(true);
      setError(null);
      await onConfirmar([{ medioPagoId, monto: total }]);
      onClose();
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
          <section className="overflow-hidden rounded-md border">
            <div className="bg-muted px-3 py-2 text-sm font-semibold">Adiciones</div>
            <div className="max-h-72 divide-y overflow-y-auto">
              {items.length > 0 ? (
                items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[3rem_1fr_auto] gap-3 px-3 py-2 text-sm">
                    <span>{item.cantidad}</span>
                    <span className="font-medium">{item.nombreProducto}</span>
                    <span>${item.subtotal.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="p-3 text-sm text-muted-foreground">No hay productos cargados.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-3">
              <span>Total</span>
              <span className="text-lg font-bold">${total.toLocaleString()}</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border">
            <div className="bg-muted px-3 py-2 text-sm font-semibold">Pago</div>
            <div className="space-y-3 p-3">
              <label className="text-sm font-medium">
                Medio de pago
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={cargando || confirmando}
                  value={medioPagoId}
                  onChange={(event) => setMedioPagoId(event.target.value)}
                >
                  {mediosPago.map((medio) => (
                    <option key={medio.id} value={medio.id}>
                      {medio.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Monto recibido
                <Input
                  className="mt-1"
                  disabled={confirmando}
                  min={0}
                  step={0.01}
                  type="number"
                  value={monto}
                  onChange={(event) => setMonto(event.target.value)}
                />
              </label>

              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Faltante</span>
                  <span>${faltante.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Vuelto</span>
                  <span className="font-semibold">${vuelto.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button disabled={confirmando} type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={confirmando || cargando || mediosPago.length === 0}
            type="button"
            onClick={confirmar}
          >
            Cerrar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
