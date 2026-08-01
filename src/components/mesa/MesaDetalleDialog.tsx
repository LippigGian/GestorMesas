import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Mesa, Pedido, PedidoItem, Producto } from "@/lib/types";
import { useState, useEffect } from "react";
import { useCatalogo } from "@/context/CatalogoContext";
import type { PagoPedidoInput, ProductoPendientePedido } from "@/services/pedidosService";
import { ChevronDown, Minus, Plus, Trash2, Users } from "lucide-react";
import { CerrarPedidoDialog } from "@/components/pedidos/CerrarPedidoDialog";

type Props = {
  mesa: Mesa | null;
  pedido: Pedido | null;
  pedidoItems: PedidoItem[];
  onConfirmarProductos: (productos: ProductoPendientePedido[]) => Promise<void> | void;
  onActualizarCantidadItem: (item: PedidoItem, cantidad: number) => Promise<void> | void;
  onEliminarItem: (itemId: string) => Promise<void> | void;
  onActualizarPersonas: (personas: number) => Promise<void> | void;
  onOcuparMesa: (personas: number) => Promise<void> | void;
  onCobroParcial: (pagos: PagoPedidoInput[]) => Promise<void> | void;
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
  onActualizarPersonas,
  onOcuparMesa,
  onCobroParcial,
  onCerrarMesa,
  onAplicarDescuento,
}: Props) {
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [personasEditando, setPersonasEditando] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoOcupacion, setConfirmandoOcupacion] = useState(false);
  const [guardandoMesa, setGuardandoMesa] = useState(false);
  const [menuMesaAbierto, setMenuMesaAbierto] = useState(false);
  const [editandoMesa, setEditandoMesa] = useState(false);
  const [errorMesa, setErrorMesa] = useState<string | null>(null);
  const [itemActualizandoId, setItemActualizandoId] = useState<string | null>(null);
  const [mostrandoCierre, setMostrandoCierre] = useState(false);
  const [itemsPendientes, setItemsPendientes] = useState<ProductoPendientePedido[]>([]);
  const [productoResaltadoIndex, setProductoResaltadoIndex] = useState(0);
  const { cargando, error, productosActivos } = useCatalogo();
  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const productosDisponibles = productosActivos.filter(
    (producto) => normalizarBusqueda(producto.nombre).includes(busquedaNormalizada)
  );
  const productosFavoritos = productosActivos.filter((producto) => producto.favorito);

  useEffect(() => {
    setCantidadPersonas("");
    setPersonasEditando(mesa?.personas ? String(mesa.personas) : "");
    setItemsPendientes([]);
    setConfirmando(false);
    setConfirmandoOcupacion(false);
    setGuardandoMesa(false);
    setMenuMesaAbierto(false);
    setEditandoMesa(false);
    setErrorMesa(null);
    setItemActualizandoId(null);
    setMostrandoCierre(false);
  }, [mesa?.id, mesa?.personas]);

  useEffect(() => {
    setProductoResaltadoIndex(0);
  }, [busquedaNormalizada]);

  useEffect(() => {
    setProductoResaltadoIndex((prev) =>
      productosDisponibles.length === 0 ? 0 : Math.min(prev, productosDisponibles.length - 1)
    );
  }, [productosDisponibles.length]);

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
    setBusqueda("");
    setProductoResaltadoIndex(0);
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

  const iniciarEdicionMesa = () => {
    setPersonasEditando(mesa?.personas ? String(mesa.personas) : "1");
    setErrorMesa(null);
    setEditandoMesa(true);
    setMenuMesaAbierto(false);
  };

  const guardarEdicionMesa = async () => {
    const personas = parseInt(personasEditando);

    if (Number.isNaN(personas) || personas <= 0 || guardandoMesa) {
      setErrorMesa("La cantidad de personas debe ser mayor a cero.");
      return;
    }

    try {
      setGuardandoMesa(true);
      setErrorMesa(null);
      await onActualizarPersonas(personas);
      setEditandoMesa(false);
    } catch (err) {
      setErrorMesa(err instanceof Error ? err.message : "No se pudo actualizar la mesa.");
    } finally {
      setGuardandoMesa(false);
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
      <aside className="flex min-h-[520px] w-full flex-col overflow-y-auto rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:w-[420px] xl:w-[480px]">
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
    <aside className="flex min-h-[520px] w-full flex-col overflow-y-auto rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:w-[420px] xl:w-[480px]">
      <div className="relative flex items-center justify-between gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="text-lg font-bold">Mesa {mesa.numero}</h2>
        {mesa.estado === "ocupada" && (
          <div className="relative">
            <Button
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setMenuMesaAbierto((prev) => !prev)}
            >
              <Users className="h-4 w-4" />
              Mesa
              <ChevronDown className="h-4 w-4" />
            </Button>

            {menuMesaAbierto && (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg">
                <button
                  className="w-full px-3 py-2 text-left text-sm transition hover:bg-muted"
                  type="button"
                  onClick={iniciarEdicionMesa}
                >
                  Editar mesa
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground"
                  disabled
                  type="button"
                >
                  Mover mesa
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground"
                  disabled
                  type="button"
                >
                  Juntar mesa
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {mesa.estado === "ocupada" ? (
        <>
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Personas</span>
              <span className="font-semibold">{mesa.personas}</span>
            </div>

            {editandoMesa && (
              <div className="rounded-md border bg-muted/40 p-3">
                <label className="block text-sm font-medium">
                  Cantidad de personas
                  <Input
                    className="mt-1"
                    min={1}
                    type="number"
                    value={personasEditando}
                    onChange={(event) => setPersonasEditando(event.target.value)}
                  />
                </label>
                {errorMesa && (
                  <p className="mt-2 text-sm text-destructive">{errorMesa}</p>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    disabled={guardandoMesa}
                    size="sm"
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditandoMesa(false);
                      setErrorMesa(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={guardandoMesa}
                    size="sm"
                    type="button"
                    onClick={guardarEdicionMesa}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Agregar productos</h3>

              {error && (
                <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {productosFavoritos.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Favoritos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {productosFavoritos.map((producto) => (
                      <Button
                        key={producto.id}
                        className="w-32 justify-start"
                        size="sm"
                        title={producto.nombre}
                        type="button"
                        variant="secondary"
                        onClick={() => agregarPendiente(producto)}
                      >
                        <span className="block w-full truncate text-left">{producto.nombre}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Input
                className="mb-2"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) {
                    return;
                  }

                  if (!busquedaNormalizada || cargando || productosDisponibles.length === 0) {
                    return;
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setProductoResaltadoIndex((prev) => (prev + 1) % productosDisponibles.length);
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setProductoResaltadoIndex(
                      (prev) =>
                        (prev - 1 + productosDisponibles.length) % productosDisponibles.length
                    );
                    return;
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    agregarPendiente(
                      productosDisponibles[productoResaltadoIndex] ?? productosDisponibles[0]
                    );
                  }
                }}
              />

              {busquedaNormalizada && (
                <div className="space-y-1 rounded-md border p-2">
                  {cargando ? (
                    <p className="p-2 text-sm text-muted-foreground">Cargando productos...</p>
                  ) : productosDisponibles.length > 0 ? (
                    productosDisponibles.map((producto, index) => (
                      <div
                        key={producto.id}
                        className={`flex items-center justify-between rounded-md px-2 py-1 transition ${
                          index === productoResaltadoIndex
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : "hover:bg-muted"
                        }`}
                        onMouseEnter={() => setProductoResaltadoIndex(index)}
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
              )}
            </div>
          </div>

          <div className="space-y-3 border-b p-4">
            <h3 className="text-sm font-semibold">Productos adicionados</h3>

            <div className="space-y-1 text-sm">
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
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between gap-4 rounded-md bg-muted px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">${total.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onAplicarDescuento}>
                Aplicar Descuento
              </Button>
              <Button variant="destructive" onClick={() => setMostrandoCierre(true)}>
                Cerrar Mesa
              </Button>
            </div>
          </div>
          <CerrarPedidoDialog
            items={pedidoItems}
            open={mostrandoCierre}
            pedidoId={pedido?.id ?? ""}
            titulo={`Cerrar mesa ${mesa.numero}`}
            total={totalConfirmado}
            onClose={() => setMostrandoCierre(false)}
            onCobroParcial={onCobroParcial}
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
