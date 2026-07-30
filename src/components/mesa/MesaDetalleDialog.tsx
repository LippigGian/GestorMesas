import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Mesa } from "@/lib/types";
import { useState, useEffect } from "react";
import { useCatalogo } from "@/context/CatalogoContext";

type Props = {
  open: boolean;
  onClose: () => void;
  mesa: Mesa | null;
  onOcuparMesa: (personas: number) => void;
  onCerrarMesa: () => void;
  onAplicarDescuento: () => void;
};

function normalizarBusqueda(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

export function MesaDetalleDialog({
  open,
  onClose,
  mesa,
  onOcuparMesa,
  onCerrarMesa,
  onAplicarDescuento,
}: Props) {
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const { cargando, error, productosActivos } = useCatalogo();
  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const productosDisponibles = productosActivos.filter(
    (producto) => normalizarBusqueda(producto.nombre).includes(busquedaNormalizada)
  );

  useEffect(() => {
    setCantidadPersonas(""); // Reiniciar input cada vez que abre
  }, [open]);

  const total = mesa?.productos?.reduce(
    (acc, p) => acc + p.precio * (p.cantidad ?? 1),
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
                    {p.nombre} x{p.cantidad ?? 1} - ${p.precio * (p.cantidad ?? 1)}
                  </li>
                ))}
              </ul>
              <p className="font-bold">Total: ${total}</p>

              <div className="mt-4 border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold">Agregar productos</h3>

                {error && (
                  <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Input
                  className="mb-2"
                  placeholder="Buscar producto..."
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                />

                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {cargando ? (
                    <p className="p-2 text-sm text-muted-foreground">Cargando productos...</p>
                  ) : productosDisponibles.length > 0 ? (
                    productosDisponibles.map((producto) => (
                        <div
                          key={producto.id}
                          className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
                        >
                          <div>
                            <p className="text-sm font-medium">{producto.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              ${producto.precio.toLocaleString()}
                            </p>
                          </div>
                          <Button size="sm" type="button" variant="secondary">
                            Agregar
                          </Button>
                        </div>
                      ))
                  ) : (
                    <p className="p-2 text-sm text-muted-foreground">
                      No hay productos para mostrar.
                    </p>
                  )}
                </div>
              </div>

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
          <p className="text-sm text-muted-foreground">Mesa no disponible.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
