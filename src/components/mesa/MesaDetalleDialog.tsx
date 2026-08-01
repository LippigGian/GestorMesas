import { useEffect, useRef, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PedidoDetallePanel } from "@/components/pedidos/PedidoDetallePanel";
import type { Mesa, Pedido, PedidoItem } from "@/lib/types";
import type { PagoPedidoInput, ProductoPendientePedido } from "@/services/pedidosService";

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
  const cantidadPersonasInputRef = useRef<HTMLInputElement>(null);
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [personasEditando, setPersonasEditando] = useState("");
  const [confirmandoOcupacion, setConfirmandoOcupacion] = useState(false);
  const [guardandoMesa, setGuardandoMesa] = useState(false);
  const [menuMesaAbierto, setMenuMesaAbierto] = useState(false);
  const [editandoMesa, setEditandoMesa] = useState(false);
  const [errorMesa, setErrorMesa] = useState<string | null>(null);

  useEffect(() => {
    setCantidadPersonas("");
    setPersonasEditando(mesa?.personas ? String(mesa.personas) : "");
    setConfirmandoOcupacion(false);
    setGuardandoMesa(false);
    setMenuMesaAbierto(false);
    setEditandoMesa(false);
    setErrorMesa(null);
  }, [mesa?.id, mesa?.personas]);

  useEffect(() => {
    if (mesa && mesa.estado !== "ocupada") {
      cantidadPersonasInputRef.current?.focus();
    }
  }, [mesa?.id, mesa?.estado]);

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

  if (!mesa || mesa.estado === "ocupada") {
    return (
      <PedidoDetallePanel
        pedido={pedido}
        pedidoItems={pedidoItems}
        titulo={mesa ? `Mesa ${mesa.numero}` : "Mesa"}
        tituloCierre={mesa ? `Cerrar mesa ${mesa.numero}` : "Cerrar mesa"}
        textoBotonCerrar="Cerrar Mesa"
        emptyTitle="Selecciona una mesa"
        emptyDescription="El detalle del pedido va a aparecer en este panel."
        infoSlot={
          mesa ? (
            <>
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
                      inputMode="numeric"
                      pattern="[0-9]*"
                      type="text"
                      value={personasEditando}
                      onChange={(event) =>
                        setPersonasEditando(event.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                  {errorMesa && <p className="mt-2 text-sm text-destructive">{errorMesa}</p>}
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
            </>
          ) : null
        }
        menu={
          mesa ? (
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
          ) : null
        }
        onActualizarCantidadItem={onActualizarCantidadItem}
        onAplicarDescuento={onAplicarDescuento}
        onCerrarPedido={onCerrarMesa}
        onCobroParcial={onCobroParcial}
        onConfirmarProductos={onConfirmarProductos}
        onEliminarItem={onEliminarItem}
      />
    );
  }

  return (
    <aside className="flex min-h-[520px] w-full flex-col overflow-y-auto rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:w-[420px] xl:w-[480px]">
      <div className="border-b bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="text-lg font-bold">Mesa {mesa.numero}</h2>
      </div>
      <div className="space-y-3 p-4">
        <label htmlFor="personas">Cantidad de personas:</label>
        <Input
          id="personas"
          ref={cantidadPersonasInputRef}
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          value={cantidadPersonas}
          onChange={(event) => setCantidadPersonas(event.target.value.replace(/\D/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirmarOcupacion();
            }
          }}
        />
        <Button disabled={confirmandoOcupacion} onClick={confirmarOcupacion}>
          {confirmandoOcupacion ? "Confirmando..." : "Confirmar"}
        </Button>
      </div>
    </aside>
  );
}
