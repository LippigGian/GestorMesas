import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Mesa } from "@/lib/types";
import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  mesa: Mesa | null;
  onOcuparMesa: (personas: number) => void;
  onCerrarMesa: () => void;
  onAplicarDescuento: () => void;
};

export function MesaDetalleDialog({
  open,
  onClose,
  mesa,
  onOcuparMesa,
  onCerrarMesa,
  onAplicarDescuento,
}: Props) {
  const [cantidadPersonas, setCantidadPersonas] = useState("");

  useEffect(() => {
    setCantidadPersonas(""); // Reiniciar input cada vez que abre
  }, [open]);

  const total = mesa?.productos?.reduce(
    (acc, p) => acc + p.precio * p.cantidad,
    0
  ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mesa ? `Mesa ${mesa.numero}` : "Mesa"}
          </DialogTitle>
        </DialogHeader>

        {mesa ? (
          mesa.estado === "ocupada" ? (
            <div className="space-y-2">
              <p>Personas: {mesa.personas}</p>
              <ul className="text-sm space-y-1">
                {mesa.productos?.map((p) => (
                  <li key={p.id}>
                    {p.nombre} x{p.cantidad} — ${p.precio * p.cantidad}
                  </li>
                ))}
              </ul>
              <p className="font-bold">Total: ${total}</p>
              <DialogFooter className="mt-4">
                <Button variant="destructive" onClick={onCerrarMesa}>
                  Cerrar Mesa
                </Button>
                <Button variant="secondary" onClick={onAplicarDescuento}>
                  Aplicar Descuento
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="personas">Cantidad de personas:</label>
              <Input
                id="personas"
                type="number"
                value={cantidadPersonas}
                onChange={(e) => setCantidadPersonas(e.target.value)}
              />
              <Button
                onClick={() => {
                  const n = parseInt(cantidadPersonas);
                  if (!isNaN(n) && n > 0) {
                    onOcuparMesa(n);
                    onClose();
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500">Mesa no disponible.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
