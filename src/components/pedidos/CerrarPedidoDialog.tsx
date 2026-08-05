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
import { useLocal } from "@/context/LocalContext";
import { obtenerMediosPago } from "@/services/mediosPagoService";
import {
  obtenerTotalPagadoPedido,
  type PagoPedidoInput,
} from "@/services/pedidosService";

type Props = {
  open: boolean;
  pedidoId: string;
  titulo: string;
  total: number;
  items: PedidoItem[];
  onClose: () => void;
  onCobroParcial?: (pagos: PagoPedidoInput[]) => Promise<void> | void;
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
  const { cargandoLocal, errorLocal, localId } = useLocal();
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [pagos, setPagos] = useState<PagoForm[]>([]);
  const [totalPagadoPrevio, setTotalPagadoPrevio] = useState(0);
  const [cobroParcial, setCobroParcial] = useState(false);
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
  const faltante = Math.max(0, pendiente - totalPagado);
  const excedente = Math.max(0, totalPagado - pendiente);

  useEffect(() => {
    if (!open) return;
    if (cargandoLocal) return;

    if (!localId) {
      setMediosPago([]);
      setPagos([]);
      setError(errorLocal ?? "No hay un local activo configurado.");
      return;
    }

    const localIdActual = localId;

    let mounted = true;

    async function cargarMediosPago() {
      try {
        setCargando(true);
        setError(null);
        setCobroParcial(false);
        const medios = await obtenerMediosPago(localIdActual);
        const pagado = await obtenerTotalPagadoPedido(pedidoId);

        if (!mounted) return;

        const pendienteActual = Math.max(0, total - pagado);
        setMediosPago(medios);
        setTotalPagadoPrevio(pagado);
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
  }, [cargandoLocal, errorLocal, localId, open, pedidoId, total]);

  const actualizarPago = (pagoId: string, patch: Partial<Omit<PagoForm, "id">>) => {
    setPagos((prev) =>
      prev.map((pago) => (pago.id === pagoId ? { ...pago, ...patch } : pago))
    );
  };

  const agregarPago = () => {
    const restante = Math.max(0, pendiente - totalPagado);
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

  const confirmar = async () => {
    if (pagos.length === 0) {
      setError("Agrega al menos un pago.");
      return;
    }

    if (pagos.some((pago) => !pago.medioPagoId)) {
      setError("Selecciona un medio de pago en cada cobro.");
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
        await onCobroParcial(pagosNormalizados);
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
                  <div key={item.id} className="grid grid-cols-[3rem_1fr_auto] gap-3 px-3 py-2 text-sm">
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
                <div className="flex justify-between">
                  <span>Saldo pendiente</span>
                  <span className="font-semibold">${pendiente.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total cobrado</span>
                  <span>${totalPagado.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Faltante</span>
                  <span>${faltante.toLocaleString()}</span>
                </div>
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
                onChange={(event) => setCobroParcial(event.target.checked)}
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
