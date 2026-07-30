import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Mesa, Pedido, PedidoItem, Producto } from "@/lib/types";
import { useState, useEffect } from "react";
import { useCatalogo } from "@/context/CatalogoContext";
import type { ProductoPendientePedido } from "@/services/pedidosService";

type Props = {
  open: boolean;
  onClose: () => void;
  mesa: Mesa | null;
  pedido: Pedido | null;
  pedidoItems: PedidoItem[];
  onConfirmarProductos: (productos: ProductoPendientePedido[]) => Promise<void> | void;
  onOcuparMesa: (personas: number) => Promise<void> | void;
  onCerrarMesa: () => Promise<void> | void;
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
  pedido,
  pedidoItems,
  onConfirmarProductos,
  onOcuparMesa,
  onCerrarMesa,
  onAplicarDescuento,
}: Props) {
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoOcupacion, setConfirmandoOcupacion] = useState(false);
  const [itemsPendientes, setItemsPendientes] = useState<ProductoPendientePedido[]>([]);
  const { cargando, error, productosActivos } = useCatalogo();
  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const productosDisponibles = productosActivos.filter(
    (producto) => normalizarBusqueda(producto.nombre).includes(busquedaNormalizada)
  );

  useEffect(() => {
    setCantidadPersonas(""); // Reiniciar input cada vez que abre
    setItemsPendientes([]);
    setConfirmando(false);
    setConfirmandoOcupacion(false);
  }, [open]);

  const totalConfirmado = pedido?.total ?? pedidoItems.reduce((acc, item) => acc + item.subtotal, 0);
  const totalPendiente = itemsPendientes.reduce(
    (acc, item) => acc + item.precioUnitario * item.cantidad,
    0
  );
  const total = totalConfirmado + totalPendiente;

  const agregarPendiente = (producto: Producto) => {
    setItemsPendientes((prev) => {
      const existente = prev.find((item) => item.productoId === producto.id);

      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }

      return [
        ...prev,
        {
          productoId: producto.id,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precio,
          cantidad: 1,
        },
      ];
    });
  };

  const confirmarPendientes = async () => {
    if (itemsPendientes.length === 0) return;

    try {
      setConfirmando(true);
      await onConfirmarProductos(itemsPendientes);
      setItemsPendientes([]);
    } finally {
      setConfirmando(false);
    }
  };

  const confirmarOcupacion = async () => {
    const personas = parseInt(cantidadPersonas);

    if (Number.isNaN(personas) || personas <= 0 || confirmandoOcupacion) {
      return;
    }

    try {
      setConfirmandoOcupacion(true);
      await onOcuparMesa(personas);
    } finally {
      setConfirmandoOcupacion(false);
    }
  };

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
                {pedidoItems.map((item) => (
                  <li key={item.id}>
                    {item.nombreProducto} x{item.cantidad} - ${item.subtotal.toLocaleString()}
                  </li>
                ))}
              </ul>
              {itemsPendientes.length > 0 && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
                  <p className="mb-1 text-sm font-semibold">Pendiente de confirmar</p>
                  <ul className="space-y-1 text-sm">
                    {itemsPendientes.map((item) => (
                      <li key={item.productoId}>
                        {item.nombreProducto} x{item.cantidad} - $
                        {(item.precioUnitario * item.cantidad).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      disabled={confirmando}
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setItemsPendientes([])}
                    >
                      Cancelar carga
                    </Button>
                    <Button
                      disabled={confirmando}
                      size="sm"
                      type="button"
                      onClick={confirmarPendientes}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
              <p className="font-bold">Total: ${total.toLocaleString()}</p>

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
                          <Button
                            size="sm"
                            type="button"
                            variant="secondary"
                            onClick={() => agregarPendiente(producto)}
                          >
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
                disabled={confirmandoOcupacion}
                onClick={confirmarOcupacion}
              >
                {confirmandoOcupacion ? "Confirmando..." : "Confirmar"}
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
