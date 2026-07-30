import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Mesa, Pedido, PedidoItem, Producto } from "@/lib/types";
import { useState, useEffect } from "react";
import { useCatalogo } from "@/context/CatalogoContext";
import type { PagoPedidoInput, ProductoPendientePedido } from "@/services/pedidosService";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CerrarPedidoDialog } from "@/components/pedidos/CerrarPedidoDialog";

type Props = {
  mesa: Mesa | null;
  pedido: Pedido | null;
  pedidoItems: PedidoItem[];
  onConfirmarProductos: (productos: ProductoPendientePedido[]) => Promise<void> | void;
  onActualizarCantidadItem: (item: PedidoItem, cantidad: number) => Promise<void> | void;
  onEliminarItem: (itemId: string) => Promise<void> | void;
  onOcuparMesa: (personas: number) => Promise<void> | void;
  onCerrarMesa: (pagos: PagoPedidoInput[]) => Promise<void> | void;
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
  mesa,
  pedido,
  pedidoItems,
  onConfirmarProductos,
  onActualizarCantidadItem,
  onEliminarItem,
  onOcuparMesa,
  onCerrarMesa,
  onAplicarDescuento,
}: Props) {
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoOcupacion, setConfirmandoOcupacion] = useState(false);
  const [itemActualizandoId, setItemActualizandoId] = useState<string | null>(null);
  const [mostrandoCierre, setMostrandoCierre] = useState(false);
  const [itemsPendientes, setItemsPendientes] = useState<ProductoPendientePedido[]>([]);
  const { cargando, error, productosActivos } = useCatalogo();
  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const productosDisponibles = productosActivos.filter(
    (producto) => normalizarBusqueda(producto.nombre).includes(busquedaNormalizada)
  );

  useEffect(() => {
    setCantidadPersonas("");
    setItemsPendientes([]);
    setConfirmando(false);
    setConfirmandoOcupacion(false);
    setItemActualizandoId(null);
    setMostrandoCierre(false);
  }, [mesa?.id]);

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

  const cambiarCantidadItem = async (item: PedidoItem, cantidad: number) => {
    try {
      setItemActualizandoId(item.id);
      await onActualizarCantidadItem(item, cantidad);
    } finally {
      setItemActualizandoId(null);
    }
  };

  const eliminarItem = async (item: PedidoItem) => {
    if (!window.confirm(`Eliminar ${item.nombreProducto} del pedido?`)) {
      return;
    }

    try {
      setItemActualizandoId(item.id);
      await onEliminarItem(item.id);
    } finally {
      setItemActualizandoId(null);
    }
  };

  if (!mesa) {
    return (
      <aside className="flex min-h-[520px] w-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:w-[420px] xl:w-[480px]">
        <div className="border-b bg-primary px-4 py-3 text-primary-foreground">
          <h2 className="text-lg font-bold">Mesa</h2>
        </div>
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">Selecciona una mesa</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El detalle del pedido va a aparecer en este panel.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-[520px] w-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:w-[420px] xl:w-[480px]">
      <div className="border-b bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="text-lg font-bold">Mesa {mesa.numero}</h2>
      </div>

      {mesa.estado === "ocupada" ? (
        <>
          <div className="space-y-2 border-b p-4">
            <p>Personas: {mesa.personas}</p>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1 text-sm">
              {pedidoItems.length > 0 ? (
                pedidoItems.map((item) => {
                  const actualizandoEsteItem = itemActualizandoId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.nombreProducto}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.precioUnitario.toLocaleString()} c/u - $
                          {item.subtotal.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          disabled={actualizandoEsteItem || item.cantidad <= 1}
                          size="icon"
                          title="Restar unidad"
                          type="button"
                          variant="outline"
                          onClick={() => cambiarCantidadItem(item, item.cantidad - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="grid h-8 min-w-8 place-items-center rounded-md border px-2 font-semibold">
                          {item.cantidad}
                        </span>
                        <Button
                          disabled={actualizandoEsteItem}
                          size="icon"
                          title="Sumar unidad"
                          type="button"
                          variant="outline"
                          onClick={() => cambiarCantidadItem(item, item.cantidad + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          disabled={actualizandoEsteItem}
                          size="icon"
                          title="Eliminar producto"
                          type="button"
                          variant="ghost"
                          onClick={() => eliminarItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed p-2 text-muted-foreground">
                  Todavia no hay productos confirmados.
                </p>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t p-4">
            <Button variant="secondary" onClick={onAplicarDescuento}>
              Aplicar Descuento
            </Button>
            <Button variant="destructive" onClick={() => setMostrandoCierre(true)}>
              Cerrar Mesa
            </Button>
          </div>
          <CerrarPedidoDialog
            items={pedidoItems}
            open={mostrandoCierre}
            titulo={`Cerrar mesa ${mesa.numero}`}
            total={totalConfirmado}
            onClose={() => setMostrandoCierre(false)}
            onConfirmar={onCerrarMesa}
          />
        </>
      ) : (
        <div className="space-y-3 p-4">
          <label htmlFor="personas">Cantidad de personas:</label>
          <Input
            id="personas"
            type="number"
            value={cantidadPersonas}
            onChange={(e) => setCantidadPersonas(e.target.value)}
          />
          <Button disabled={confirmandoOcupacion} onClick={confirmarOcupacion}>
            {confirmandoOcupacion ? "Confirmando..." : "Confirmar"}
          </Button>
        </div>
      )}
    </aside>
  );
}
