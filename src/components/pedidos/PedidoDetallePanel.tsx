import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MessageSquare, Minus, Percent, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CerrarPedidoDialog } from "@/components/pedidos/CerrarPedidoDialog";
import { useCatalogo } from "@/context/CatalogoContext";
import type { Pedido, PedidoItem, Producto } from "@/lib/types";
import type {
  DescuentoPedidoInput,
  ItemCobroParcialInput,
  PagoPedidoInput,
  ProductoPendientePedido,
} from "@/services/pedidosService";

type PedidoDetallePanelProps = {
  pedido: Pedido | null;
  pedidoItems: PedidoItem[];
  titulo: string;
  tituloCierre: string;
  textoBotonCerrar: string;
  menu?: ReactNode;
  infoSlot?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  widthClassName?: string;
  onConfirmarProductos: (productos: ProductoPendientePedido[]) => Promise<void> | void;
  onActualizarCantidadItem: (item: PedidoItem, cantidad: number) => Promise<void> | void;
  onEliminarItem: (itemId: string) => Promise<void> | void;
  onCobroParcial: (
    pagos: PagoPedidoInput[],
    itemsCobrados?: ItemCobroParcialInput[]
  ) => Promise<void> | void;
  onCerrarPedido: (pagos: PagoPedidoInput[]) => Promise<void> | void;
  onAplicarDescuento?: (descuento: DescuentoPedidoInput) => Promise<void> | void;
};

type ProductoPendienteUI = ProductoPendientePedido & {
  id: string;
  totalInput: string;
};

function normalizarBusqueda(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
}

function esPrecioInput(value: string) {
  return /^\d*(?:[,.]\d{0,2})?$/.test(value);
}

function parsePrecioInput(value: string) {
  const precio = Number(value.trim().replace(",", "."));
  return Number.isFinite(precio) && precio > 0 ? precio : null;
}

function formatearMontoInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function PedidoDetallePanel({
  pedido,
  pedidoItems,
  titulo,
  tituloCierre,
  textoBotonCerrar,
  menu,
  infoSlot,
  emptyTitle,
  emptyDescription,
  widthClassName = "lg:w-[420px] xl:w-[480px]",
  onConfirmarProductos,
  onActualizarCantidadItem,
  onEliminarItem,
  onCobroParcial,
  onCerrarPedido,
  onAplicarDescuento,
}: PedidoDetallePanelProps) {
  const [busqueda, setBusqueda] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [itemActualizandoId, setItemActualizandoId] = useState<string | null>(null);
  const [mostrandoCierre, setMostrandoCierre] = useState(false);
  const [itemsPendientes, setItemsPendientes] = useState<ProductoPendienteUI[]>([]);
  const [productoResaltadoIndex, setProductoResaltadoIndex] = useState(0);
  const [errorPendientes, setErrorPendientes] = useState<string | null>(null);
  const [mostrandoDescuento, setMostrandoDescuento] = useState(false);
  const [tipoDescuento, setTipoDescuento] = useState<DescuentoPedidoInput["tipo"]>("monto");
  const [valorDescuento, setValorDescuento] = useState("");
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
  const [errorDescuento, setErrorDescuento] = useState<string | null>(null);
  const { cargando, error, productosActivos } = useCatalogo();
  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const productosDisponibles = useMemo(
    () =>
      busquedaNormalizada
        ? productosActivos.filter((producto) =>
            normalizarBusqueda(producto.nombre).includes(busquedaNormalizada)
          )
        : [],
    [busquedaNormalizada, productosActivos]
  );
  const productosFavoritos = useMemo(
    () => productosActivos.filter((producto) => producto.favorito),
    [productosActivos]
  );

  useEffect(() => {
    setBusqueda("");
    setConfirmando(false);
    setItemActualizandoId(null);
    setMostrandoCierre(false);
    setItemsPendientes([]);
    setProductoResaltadoIndex(0);
    setErrorPendientes(null);
    setMostrandoDescuento(false);
    setTipoDescuento("monto");
    setValorDescuento("");
    setAplicandoDescuento(false);
    setErrorDescuento(null);
  }, [pedido?.id]);

  useEffect(() => {
    setProductoResaltadoIndex(0);
  }, [busquedaNormalizada]);

  useEffect(() => {
    setProductoResaltadoIndex((prev) =>
      productosDisponibles.length === 0 ? 0 : Math.min(prev, productosDisponibles.length - 1)
    );
  }, [productosDisponibles.length]);

  const totalConfirmado = pedido?.total ?? pedidoItems.reduce((acc, item) => acc + item.subtotal, 0);
  const subtotalSinDescuento = pedidoItems
    .filter((item) => item.subtotal > 0)
    .reduce((acc, item) => acc + item.subtotal, 0);
  const descuentoAplicado = Math.abs(
    pedidoItems
      .filter((item) => item.subtotal < 0)
      .reduce((acc, item) => acc + item.subtotal, 0)
  );
  const itemDescuento = pedidoItems.find((item) => item.subtotal < 0);
  const detalleDescuento = itemDescuento?.comentario;
  const totalPendiente = itemsPendientes.reduce((acc, item) => {
    const totalItem = parsePrecioInput(item.totalInput);
    return acc + (totalItem ?? 0);
  }, 0);
  const total = totalConfirmado;

  const agregarPendiente = (producto: Producto) => {
    setErrorPendientes(null);
    setItemsPendientes((prev) => {
      const existente = prev.find(
        (item) =>
          item.productoId === producto.id &&
          item.precioUnitario === producto.precio &&
          parsePrecioInput(item.totalInput) === item.cantidad * producto.precio &&
          !item.comentario
      );

      if (existente) {
        return prev.map((item) =>
          item.id === existente.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                totalInput: formatearMontoInput((item.cantidad + 1) * producto.precio),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          productoId: producto.id,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precio,
          totalInput: formatearMontoInput(producto.precio),
          cantidad: 1,
          comentario: "",
        },
      ];
    });
    setBusqueda("");
    setProductoResaltadoIndex(0);
  };

  const confirmarPendientes = async () => {
    if (itemsPendientes.length === 0) return;

    let productosNormalizados: ProductoPendientePedido[] = [];

    try {
      productosNormalizados = itemsPendientes.map((item) => {
        const totalItem = parsePrecioInput(item.totalInput);

        if (totalItem === null) {
          throw new Error("Revisa los precios de los productos pendientes.");
        }

        return {
          productoId: item.productoId,
          nombreProducto: item.nombreProducto,
          precioUnitario: totalItem / item.cantidad,
          cantidad: item.cantidad,
          comentario: item.comentario?.trim() || undefined,
        };
      });
    } catch (err) {
      setErrorPendientes(
        err instanceof Error ? err.message : "Revisa los productos pendientes."
      );
      return;
    }

    try {
      setConfirmando(true);
      setErrorPendientes(null);
      await onConfirmarProductos(productosNormalizados);
      setItemsPendientes([]);
    } catch (err) {
      setErrorPendientes(err instanceof Error ? err.message : "No se pudo confirmar la carga.");
    } finally {
      setConfirmando(false);
    }
  };

  const actualizarPendiente = (itemId: string, patch: Partial<ProductoPendienteUI>) => {
    setErrorPendientes(null);
    setItemsPendientes((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  };

  const cambiarCantidadPendiente = (itemId: string, cantidad: number) => {
    setErrorPendientes(null);
    setItemsPendientes((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const cantidadActual = Math.max(1, item.cantidad);
        const cantidadNueva = Math.max(1, cantidad);
        const totalActual = parsePrecioInput(item.totalInput);
        const totalNuevo =
          totalActual === null ? item.precioUnitario * cantidadNueva : (totalActual / cantidadActual) * cantidadNueva;

        return {
          ...item,
          cantidad: cantidadNueva,
          totalInput: formatearMontoInput(totalNuevo),
        };
      })
    );
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
    if (!window.confirm(`Eliminar ${item.nombreProducto} del pedido?`)) return;

    try {
      setItemActualizandoId(item.id);
      await onEliminarItem(item.id);
    } finally {
      setItemActualizandoId(null);
    }
  };

  const anularDescuento = async () => {
    if (!itemDescuento) return;
    if (!window.confirm("Anular el descuento aplicado?")) return;

    try {
      setItemActualizandoId(itemDescuento.id);
      await onEliminarItem(itemDescuento.id);
    } finally {
      setItemActualizandoId(null);
    }
  };

  const aplicarDescuento = async () => {
    if (!onAplicarDescuento) return;

    const valor = parsePrecioInput(valorDescuento);

    if (valor === null) {
      setErrorDescuento("Ingresa un descuento mayor a cero.");
      return;
    }

    if (tipoDescuento === "porcentaje" && valor > 100) {
      setErrorDescuento("El porcentaje no puede superar el 100%.");
      return;
    }

    try {
      setAplicandoDescuento(true);
      setErrorDescuento(null);
      await onAplicarDescuento({ tipo: tipoDescuento, valor });
      setMostrandoDescuento(false);
      setValorDescuento("");
    } catch (err) {
      setErrorDescuento(err instanceof Error ? err.message : "No se pudo aplicar el descuento.");
    } finally {
      setAplicandoDescuento(false);
    }
  };

  return (
    <aside
      className={`flex min-h-[520px] w-full flex-col overflow-y-auto rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] ${widthClassName}`}
    >
      <div className="relative flex items-center justify-between gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="text-lg font-bold">{titulo}</h2>
        {menu}
      </div>

      {pedido ? (
        <>
          <div className="space-y-3 border-b p-4">
            {infoSlot}

            <div>
              {/* <h3 className="mb-2 text-sm font-semibold">Agregar productos</h3> */}

              {error && (
                <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {productosFavoritos.length > 0 && (
                <div className="mb-3">
                  {/* <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Favoritos
                  </p> */}
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
                  if (event.nativeEvent.isComposing) return;

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
                  const esDescuento = item.subtotal < 0;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.nombreProducto}</p>
                        <p className="text-xs text-muted-foreground">
                          {esDescuento
                            ? `-$${Math.abs(item.subtotal).toLocaleString()}`
                            : `$${item.precioUnitario.toLocaleString()} c/u - $${item.subtotal.toLocaleString()}`}
                        </p>
                        {item.comentario && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.comentario}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!esDescuento && (
                          <>
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
                          </>
                        )}
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
                <p className="mb-2 text-sm font-semibold">Pendiente de confirmar</p>
                {errorPendientes && (
                  <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                    {errorPendientes}
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  {itemsPendientes.map((item) => (
                    <div key={item.id} className="rounded-md border bg-card p-2">
                      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
                        <div className="flex items-center overflow-hidden rounded-md border">
                          <Button
                            className="h-9 rounded-none border-0"
                            disabled={item.cantidad <= 1}
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => cambiarCantidadPendiente(item.id, item.cantidad - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="grid h-9 min-w-10 place-items-center border-x px-2 font-semibold">
                            {item.cantidad}
                          </span>
                          <Button
                            className="h-9 rounded-none border-0"
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => cambiarCantidadPendiente(item.id, item.cantidad + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="min-w-0 truncate font-semibold" title={item.nombreProducto}>
                          {item.nombreProducto}
                        </p>
                        <div className="flex items-center gap-1" title="Total de este producto antes de confirmar">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            className="h-9 w-24 text-right"
                            inputMode="decimal"
                            aria-label={`Total pendiente de ${item.nombreProducto}`}
                            value={item.totalInput}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (!esPrecioInput(value)) return;

                              actualizarPendiente(item.id, {
                                totalInput: value,
                                precioUnitario: (parsePrecioInput(value) ?? 0) / item.cantidad,
                              });
                            }}
                          />
                        </div>
                        <Button
                          size="icon"
                          title="Quitar de pendientes"
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setItemsPendientes((prev) =>
                              prev.filter((pendiente) => pendiente.id !== item.id)
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Input
                          placeholder="Agrega un comentario aqui..."
                          value={item.comentario ?? ""}
                          onChange={(event) =>
                            actualizarPendiente(item.id, { comentario: event.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <div className="mr-auto flex items-center rounded-md bg-muted px-3 py-1 text-sm">
                    <span className="text-muted-foreground">Total a confirmar</span>
                    <span className="ml-2 font-bold">${totalPendiente.toLocaleString()}</span>
                  </div>
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
            {mostrandoDescuento && onAplicarDescuento && (
              <div className="mb-3 rounded-md border bg-muted/40 p-3">
                <div className="mb-3 flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant={tipoDescuento === "monto" ? "default" : "secondary"}
                    onClick={() => {
                      setTipoDescuento("monto");
                      setErrorDescuento(null);
                    }}
                  >
                    $ Monto fijo
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant={tipoDescuento === "porcentaje" ? "default" : "secondary"}
                    onClick={() => {
                      setTipoDescuento("porcentaje");
                      setErrorDescuento(null);
                    }}
                  >
                    <Percent className="h-4 w-4" />
                    Porcentaje
                  </Button>
                </div>
                <label className="block text-sm font-medium">
                  {tipoDescuento === "monto" ? "Monto de descuento" : "Porcentaje de descuento"}
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {tipoDescuento === "monto" ? "$" : "%"}
                    </span>
                    <Input
                      className="pl-8"
                      inputMode="decimal"
                      placeholder={tipoDescuento === "monto" ? "Ej: 1500" : "Ej: 10"}
                      value={valorDescuento}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!esPrecioInput(value)) return;
                        setValorDescuento(value);
                        setErrorDescuento(null);
                      }}
                    />
                  </div>
                </label>
                {errorDescuento && (
                  <p className="mt-2 text-sm text-destructive">{errorDescuento}</p>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    disabled={aplicandoDescuento}
                    size="sm"
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMostrandoDescuento(false);
                      setValorDescuento("");
                      setErrorDescuento(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={aplicandoDescuento}
                    size="sm"
                    type="button"
                    onClick={aplicarDescuento}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-3 space-y-2 rounded-md bg-muted px-3 py-2">
              {descuentoAplicado > 0 && (
                <>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotalSinDescuento.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-emerald-700">
                    <span>Descuento aplicado</span>
                    <span className="font-semibold">-${descuentoAplicado.toLocaleString()}</span>
                  </div>
                  {detalleDescuento && (
                    <p className="text-xs text-muted-foreground">{detalleDescuento}</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      disabled={itemActualizandoId === itemDescuento?.id}
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={anularDescuento}
                    >
                      Anular descuento
                    </Button>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">${total.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {onAplicarDescuento && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMostrandoDescuento((prev) => !prev);
                    setErrorDescuento(null);
                  }}
                >
                  Aplicar Descuento
                </Button>
              )}
              <Button variant="destructive" onClick={() => setMostrandoCierre(true)}>
                {textoBotonCerrar}
              </Button>
            </div>
          </div>
          <CerrarPedidoDialog
            items={pedidoItems}
            open={mostrandoCierre}
            pedidoId={pedido.id}
            titulo={tituloCierre}
            total={totalConfirmado}
            onClose={() => setMostrandoCierre(false)}
            onCobroParcial={onCobroParcial}
            onConfirmar={onCerrarPedido}
          />
        </>
      ) : (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
