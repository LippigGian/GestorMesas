import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
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
import {
  obtenerCantidadesCobradasItems,
  obtenerTotalPagadoPedido,
  type ItemCobroParcialInput,
  type PagoPedidoInput,
} from "@/services/pedidosService";

type Props = {
  open: boolean;
  pedidoId: string;
  titulo: string;
  total: number;
  items: PedidoItem[];
  onClose: () => void;
  onCobroParcial?: (
    pagos: PagoPedidoInput[],
    itemsCobrados?: ItemCobroParcialInput[]
  ) => Promise<void> | void;
  onConfirmar: (pagos: PagoPedidoInput[]) => Promise<void> | void;
};

type PagoForm = {
  id: string;
  medioPagoId: string;
  monto: string;
};

function crearPagoId() {
  return crypto.randomUUID();
}

function parseMonto(value: string) {
  const limpio = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
    throw new Error("Todos los montos deben ser numeros validos.");
  }

  const monto = Number(limpio);

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Todos los montos deben ser mayores a cero.");
  }

  return monto;
}

function formatearMontoInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function CerrarPedidoDialog({
  open,
  pedidoId,
  titulo,
  total,
  items,
  onClose,
  onCobroParcial,
  onConfirmar,
}: Props) {
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [pagos, setPagos] = useState<PagoForm[]>([]);
  const [totalPagadoPrevio, setTotalPagadoPrevio] = useState(0);
  const [cobroParcial, setCobroParcial] = useState(false);
  const [itemsCobroParcial, setItemsCobroParcial] = useState<Record<string, number>>({});
  const [cantidadesCobradas, setCantidadesCobradas] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalPagado = useMemo(
    () =>
      pagos.reduce((acc, pago) => {
        const monto = Number(pago.monto.replace(",", "."));
        return acc + (Number.isFinite(monto) ? monto : 0);
      }, 0),
    [pagos]
  );
  const pendiente = Math.max(0, total - totalPagadoPrevio);
  const itemsPositivos = useMemo(() => items.filter((item) => item.subtotal > 0), [items]);
  const itemsCobrables = useMemo(
    () =>
      itemsPositivos.filter((item) => {
        const cantidadCobrada = cantidadesCobradas[item.id] ?? 0;
        return cantidadCobrada < item.cantidad;
      }),
    [itemsPositivos, cantidadesCobradas]
  );
  const totalItemsSeleccionados = useMemo(
    () =>
      itemsCobrables.reduce((acc, item) => {
        const cantidadSeleccionada = itemsCobroParcial[item.id] ?? 0;
        return acc + (item.subtotal / item.cantidad) * cantidadSeleccionada;
      }, 0),
    [itemsCobrables, itemsCobroParcial]
  );
  const objetivoCobro = cobroParcial ? totalItemsSeleccionados : pendiente;
  const totalCobradoAcumulado = totalPagadoPrevio + totalPagado;
  const saldoRestanteLuegoDelCobro = Math.max(0, total - totalCobradoAcumulado);
  const faltante = Math.max(0, objetivoCobro - totalPagado);
  const excedente = Math.max(0, totalPagado - objetivoCobro);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function cargarMediosPago() {
      try {
        setCargando(true);
        setError(null);
        setCobroParcial(false);
        setItemsCobroParcial({});
        setCantidadesCobradas({});
        const medios = await obtenerMediosPago();
        const [pagado, cantidadesCobradasDb] = await Promise.all([
          obtenerTotalPagadoPedido(pedidoId),
          obtenerCantidadesCobradasItems(pedidoId),
        ]);

        if (!mounted) return;

        const pendienteActual = Math.max(0, total - pagado);
        setMediosPago(medios);
        setTotalPagadoPrevio(pagado);
        setCantidadesCobradas(cantidadesCobradasDb);
        setPagos([
          {
            id: crearPagoId(),
            medioPagoId: medios[0]?.id ?? "",
            monto: String(pendienteActual),
          },
        ]);
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
  }, [open, pedidoId, total]);

  useEffect(() => {
    if (!cobroParcial) {
      setItemsCobroParcial({});
      return;
    }

    setPagos((prev) => {
      if (prev.length !== 1) {
        return prev;
      }

      return prev.map((pago) => ({
        ...pago,
        monto: totalItemsSeleccionados > 0 ? formatearMontoInput(totalItemsSeleccionados) : "",
      }));
    });
  }, [cobroParcial, totalItemsSeleccionados]);

  const actualizarPago = (pagoId: string, patch: Partial<Omit<PagoForm, "id">>) => {
    setPagos((prev) =>
      prev.map((pago) => (pago.id === pagoId ? { ...pago, ...patch } : pago))
    );
  };

  const agregarPago = () => {
    const restante = Math.max(0, objetivoCobro - totalPagado);
    setPagos((prev) => [
      ...prev,
      {
        id: crearPagoId(),
        medioPagoId: mediosPago[0]?.id ?? "",
        monto: restante > 0 ? String(restante) : "",
      },
    ]);
  };

  const quitarPago = (pagoId: string) => {
    setPagos((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((pago) => pago.id !== pagoId);
    });
  };

  const cambiarCantidadCobroItem = (item: PedidoItem, cantidad: number) => {
    const cantidadDisponible = item.cantidad - (cantidadesCobradas[item.id] ?? 0);
    const cantidadNormalizada = Math.max(0, Math.min(cantidadDisponible, Math.floor(cantidad)));
    setError(null);
    setItemsCobroParcial((prev) => {
      const siguiente = { ...prev };

      if (cantidadNormalizada === 0) {
        delete siguiente[item.id];
      } else {
        siguiente[item.id] = cantidadNormalizada;
      }

      return siguiente;
    });
  };

  const confirmar = async () => {
    if (pagos.length === 0) {
      setError("Agrega al menos un pago.");
      return;
    }

    if (pagos.some((pago) => !pago.medioPagoId)) {
      setError("Selecciona un medio de pago en cada cobro.");
      return;
    }

    if (cobroParcial && totalItemsSeleccionados <= 0) {
      setError("Selecciona al menos un producto para cobrar.");
      return;
    }

    let pagosNormalizados: PagoPedidoInput[] = [];

    try {
      pagosNormalizados = pagos.map((pago) => ({
        medioPagoId: pago.medioPagoId,
        monto: parseMonto(pago.monto),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los montos de pago.");
      return;
    }

    const suma = pagosNormalizados.reduce((acc, pago) => acc + pago.monto, 0);

    if (cobroParcial) {
      if (!onCobroParcial) {
        setError("El cobro parcial no esta disponible para este pedido.");
        return;
      }

      if (Math.abs(suma - totalItemsSeleccionados) > 0.01) {
        setError("La suma de los cobros debe coincidir con los productos seleccionados.");
        return;
      }

      if (suma >= pendiente - 0.01) {
        setError("Para cobrar el saldo completo usa Cerrar venta.");
        return;
      }
    } else if (Math.abs(suma - pendiente) > 0.01) {
      setError("La suma de los cobros debe coincidir con el saldo pendiente.");
      return;
    }

    try {
      setConfirmando(true);
      setError(null);
      if (cobroParcial && onCobroParcial) {
        const itemsCobrados = itemsCobrables
          .map((item) => {
            const cantidad = itemsCobroParcial[item.id] ?? 0;
            const precioUnitario = item.subtotal / item.cantidad;

            return {
              pedidoItemId: item.id,
              cantidad,
              monto: precioUnitario * cantidad,
            };
          })
          .filter((item) => item.cantidad > 0);

        await onCobroParcial(pagosNormalizados, itemsCobrados);
      } else {
        await onConfirmar(pagosNormalizados);
      }
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
                  <div
                    key={item.id}
                    className="grid grid-cols-[3rem_1fr_auto] gap-3 px-3 py-2 text-sm"
                  >
                    <span>{item.cantidad}</span>
                    <span>
                      <span className="block font-medium">{item.nombreProducto}</span>
                      {item.comentario && (
                        <span className="block text-xs text-muted-foreground">
                          {item.comentario}
                        </span>
                      )}
                    </span>
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
            {totalPagadoPrevio > 0 && (
              <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2 text-sm">
                <span>Pagado anteriormente</span>
                <span className="font-semibold">${totalPagadoPrevio.toLocaleString()}</span>
              </div>
            )}
            {cobroParcial && (
              <div className="border-t p-3">
                <p className="mb-2 text-sm font-semibold">Seleccionar productos a cobrar</p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {itemsPositivos.length > 0 ? (
                    itemsPositivos.map((item) => {
                      const cantidadSeleccionada = itemsCobroParcial[item.id] ?? 0;
                      const cantidadCobrada = cantidadesCobradas[item.id] ?? 0;
                      const cantidadDisponible = item.cantidad - cantidadCobrada;
                      const precioUnitario = item.subtotal / item.cantidad;
                      const seleccionado = cantidadSeleccionada > 0;
                      const cobradoCompleto = cantidadDisponible <= 0;
                      const cobradoParcial = cantidadCobrada > 0 && !cobradoCompleto;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-md border p-2 text-sm transition ${
                            cobradoCompleto
                              ? "border-emerald-200 bg-emerald-50 text-emerald-950 opacity-85"
                              : cobradoParcial
                                ? "border-amber-200 bg-amber-50"
                                : seleccionado
                                  ? "border-primary bg-primary/5"
                                  : "bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex min-w-0 flex-1 items-center gap-2">
                              <input
                                checked={seleccionado}
                                className="h-4 w-4"
                                disabled={confirmando || cobradoCompleto}
                                type="checkbox"
                                onChange={(event) =>
                                  cambiarCantidadCobroItem(
                                    item,
                                    event.target.checked ? 1 : 0
                                  )
                                }
                              />
                              <span className="min-w-0">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="truncate font-medium">
                                    {item.nombreProducto}
                                  </span>
                                  {cobradoCompleto ? (
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      Cobrado
                                    </span>
                                  ) : cobradoParcial ? (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                      Parcial
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ${precioUnitario.toLocaleString()} c/u
                                  {cantidadCobrada > 0
                                    ? ` - ${cantidadCobrada} de ${item.cantidad} ya cobrada`
                                    : ""}
                                </span>
                              </span>
                            </label>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                disabled={confirmando || cobradoCompleto || cantidadSeleccionada <= 0}
                                size="icon"
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  cambiarCantidadCobroItem(item, cantidadSeleccionada - 1)
                                }
                              >
                                -
                              </Button>
                              <span className="grid h-9 min-w-9 place-items-center rounded-md border px-2 font-semibold">
                                {cantidadSeleccionada}
                              </span>
                              <Button
                                disabled={
                                  confirmando ||
                                  cobradoCompleto ||
                                  cantidadSeleccionada >= cantidadDisponible
                                }
                                size="icon"
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  cambiarCantidadCobroItem(item, cantidadSeleccionada + 1)
                                }
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay productos cobrables.</p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span>Total seleccionado</span>
                  <span className="font-bold">${totalItemsSeleccionados.toLocaleString()}</span>
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-md border">
            <div className="flex items-center justify-between bg-muted px-3 py-2 text-sm font-semibold">
              <span>Pago</span>
              <Button
                disabled={cargando || confirmando || mediosPago.length === 0}
                size="icon"
                type="button"
                variant="secondary"
                onClick={agregarPago}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-3">
              {pagos.map((pago) => (
                <div key={pago.id} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                  <label className="text-sm font-medium">
                    Medio
                    <select
                      className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                      disabled={cargando || confirmando}
                      value={pago.medioPagoId}
                      onChange={(event) =>
                        actualizarPago(pago.id, { medioPagoId: event.target.value })
                      }
                    >
                      {mediosPago.map((medio) => (
                        <option key={medio.id} value={medio.id}>
                          {medio.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Importe
                    <Input
                      className="mt-1"
                      disabled={confirmando}
                      inputMode="decimal"
                      type="text"
                      value={pago.monto}
                      onChange={(event) => actualizarPago(pago.id, { monto: event.target.value })}
                    />
                  </label>

                  <Button
                    disabled={confirmando || pagos.length === 1}
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => quitarPago(pago.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="rounded-md bg-muted/50 p-3 text-sm">
                {cobroParcial && (
                  <div className="flex justify-between">
                    <span>Productos seleccionados</span>
                    <span className="font-semibold">${objetivoCobro.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Saldo pendiente total</span>
                  <span className="font-semibold">${pendiente.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cobro actual</span>
                  <span>${totalPagado.toLocaleString()}</span>
                </div>
                {totalPagadoPrevio > 0 && (
                  <div className="flex justify-between">
                    <span>Cobrado anteriormente</span>
                    <span>${totalPagadoPrevio.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total cobrado</span>
                  <span className="font-semibold">${totalCobradoAcumulado.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{cobroParcial ? "Faltante seleccion" : "Faltante"}</span>
                  <span>${faltante.toLocaleString()}</span>
                </div>
                {totalPagado > 0 && (
                  <div className="flex justify-between">
                    <span>Saldo luego del cobro</span>
                    <span>${saldoRestanteLuegoDelCobro.toLocaleString()}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between">
                  <span>Excedente</span>
                  <span className="font-semibold">${excedente.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          {onCobroParcial && (
            <label className="mr-auto flex items-center gap-2 text-sm">
              <input
                checked={cobroParcial}
                className="h-4 w-4"
                disabled={confirmando}
                type="checkbox"
                onChange={(event) => {
                  setCobroParcial(event.target.checked);
                  setError(null);
                  if (!event.target.checked) {
                    setPagos((prev) =>
                      prev.length === 1
                        ? prev.map((pago) => ({ ...pago, monto: formatearMontoInput(pendiente) }))
                        : prev
                    );
                  }
                }}
              />
              Cobro parcial
            </label>
          )}
          <Button disabled={confirmando} type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={confirmando || cargando || mediosPago.length === 0}
            type="button"
            onClick={confirmar}
          >
            {cobroParcial ? "Registrar cobro" : "Cerrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
