import { useEffect, useState } from 'react';
import { ArrowRightLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PedidoDetallePanel } from '@/components/pedidos/PedidoDetallePanel';
import type { Pedido, PedidoItem } from '@/lib/types';
import {
  actualizarCantidadItemPedido,
  actualizarClientePedido,
  cerrarPedido,
  confirmarProductosPedido,
  crearPedidoMostrador,
  eliminarItemPedido,
  obtenerItemsPedido,
  obtenerPedidosMostradorAbiertos,
  registrarPagoParcialPedido,
  type ItemCobroParcialInput,
  type PagoPedidoInput,
  type ProductoPendientePedido,
} from '@/services/pedidosService';

function formatearFecha(value?: string) {
  if (!value) return '-';

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;

  return fecha.toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function crearTituloPedido(pedido: Pedido) {
  return pedido.cliente?.trim() || `Pedido ${pedido.id.slice(0, 8)}`;
}

export function Mostrador() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [pedidoItems, setPedidoItems] = useState<PedidoItem[]>([]);
  const [cliente, setCliente] = useState('');
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuPedidoAbierto, setMenuPedidoAbierto] = useState(false);
  const [errorMostrador, setErrorMostrador] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarPedidos() {
      try {
        setCargandoPedidos(true);
        setErrorMostrador(null);
        const abiertos = await obtenerPedidosMostradorAbiertos();

        if (!mounted) return;

        setPedidos(abiertos);
      } catch (err) {
        if (mounted) {
          setErrorMostrador(
            err instanceof Error ? err.message : 'No se pudieron cargar los pedidos'
          );
        }
      } finally {
        if (mounted) {
          setCargandoPedidos(false);
        }
      }
    }

    cargarPedidos();

    return () => {
      mounted = false;
    };
  }, []);

  const actualizarPedidoSeleccionado = (pedido: Pedido) => {
    setPedidoSeleccionado(pedido);
    setCliente(pedido.cliente ?? '');
    setPedidos((prev) => prev.map((item) => (item.id === pedido.id ? pedido : item)));
  };

  const actualizarTotalPedidoActivo = (items: PedidoItem[]) => {
    setPedidoItems(items);
    setPedidoSeleccionado((prev) => {
      if (!prev) return prev;

      const actualizado = {
        ...prev,
        total: items.reduce((acc, item) => acc + item.subtotal, 0),
      };
      setPedidos((pedidosPrevios) =>
        pedidosPrevios.map((pedido) => (pedido.id === actualizado.id ? actualizado : pedido))
      );
      return actualizado;
    });
  };

  const seleccionarPedido = async (pedido: Pedido) => {
    try {
      setErrorMostrador(null);
      setPedidoSeleccionado(pedido);
      setCliente(pedido.cliente ?? '');
      setMenuPedidoAbierto(false);
      setPedidoItems(await obtenerItemsPedido(pedido.id));
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
    }
  };

  const crearNuevoPedido = async () => {
    try {
      setGuardando(true);
      setErrorMostrador(null);
      const pedido = await crearPedidoMostrador();
      setPedidos((prev) => [pedido, ...prev]);
      setPedidoSeleccionado(pedido);
      setPedidoItems([]);
      setMenuPedidoAbierto(false);
      setCliente('');
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo crear el pedido');
    } finally {
      setGuardando(false);
    }
  };

  const guardarCliente = async () => {
    if (!pedidoSeleccionado) return;

    try {
      setGuardando(true);
      setErrorMostrador(null);
      actualizarPedidoSeleccionado(await actualizarClientePedido(pedidoSeleccionado.id, cliente));
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo guardar el cliente');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarProductos = async (productos: ProductoPendientePedido[]) => {
    if (!pedidoSeleccionado || productos.length === 0) return;

    try {
      setGuardando(true);
      setErrorMostrador(null);
      const items = await confirmarProductosPedido(pedidoSeleccionado.id, productos);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const cambiarCantidadItem = async (item: PedidoItem, cantidad: number) => {
    if (!pedidoSeleccionado) return;

    try {
      setErrorMostrador(null);
      const items = await actualizarCantidadItemPedido(pedidoSeleccionado.id, item, cantidad);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo actualizar el producto');
      throw err;
    }
  };

  const eliminarItem = async (itemId: string) => {
    if (!pedidoSeleccionado) return;

    try {
      setErrorMostrador(null);
      const items = await eliminarItemPedido(pedidoSeleccionado.id, itemId);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo eliminar el producto');
      throw err;
    }
  };

  const finalizarPedido = async (pagos: PagoPedidoInput[]) => {
    if (!pedidoSeleccionado) {
      return;
    }

    try {
      setGuardando(true);
      setErrorMostrador(null);
      await cerrarPedido(pedidoSeleccionado.id, pagos);
      setPedidos((prev) => prev.filter((pedido) => pedido.id !== pedidoSeleccionado.id));
      setPedidoSeleccionado(null);
      setPedidoItems([]);
      setMenuPedidoAbierto(false);
      setCliente('');
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo finalizar el pedido');
    } finally {
      setGuardando(false);
    }
  };

  const registrarCobroParcial = async (
    pagos: PagoPedidoInput[],
    itemsCobrados: ItemCobroParcialInput[] = []
  ) => {
    if (!pedidoSeleccionado) {
      return;
    }

    try {
      setGuardando(true);
      setErrorMostrador(null);
      await registrarPagoParcialPedido(pedidoSeleccionado.id, pagos, itemsCobrados);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo registrar el cobro parcial');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Mostrador</h2>
        <Button disabled={guardando} onClick={crearNuevoPedido}>
          + Nuevo Pedido
        </Button>
      </div>

      {errorMostrador && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMostrador}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">
            Pedidos abiertos
          </div>

          {cargandoPedidos ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando pedidos...</p>
          ) : pedidos.length > 0 ? (
            <div className="divide-y">
              {pedidos.map((pedido) => (
                <button
                  key={pedido.id}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-muted/60 ${
                    pedidoSeleccionado?.id === pedido.id ? 'bg-accent/20' : ''
                  }`}
                  type="button"
                  onClick={() => seleccionarPedido(pedido)}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{crearTituloPedido(pedido)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(pedido.horaInicio)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">${pedido.total.toLocaleString()}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No hay pedidos abiertos de mostrador.
            </p>
          )}
        </section>

        <PedidoDetallePanel
          pedido={pedidoSeleccionado}
          pedidoItems={pedidoItems}
          titulo={pedidoSeleccionado ? crearTituloPedido(pedidoSeleccionado) : 'Mostrador'}
          tituloCierre="Cerrar pedido de mostrador"
          textoBotonCerrar="Finalizar Pedido"
          emptyTitle="Selecciona un pedido"
          emptyDescription="O crea uno nuevo para empezar a cargar productos."
          widthClassName="lg:w-[460px] xl:w-[520px]"
          infoSlot={
            pedidoSeleccionado ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="cliente">
                  Cliente
                </label>
                <div className="flex gap-2">
                  <Input
                    id="cliente"
                    placeholder="Nombre opcional"
                    value={cliente}
                    onChange={(event) => setCliente(event.target.value)}
                    onBlur={guardarCliente}
                  />
                  <Button disabled={guardando} type="button" variant="secondary" onClick={guardarCliente}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : null
          }
          menu={
            pedidoSeleccionado ? (
              <div className="relative">
                <Button
                  className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setMenuPedidoAbierto((prev) => !prev)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Pedido
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {menuPedidoAbierto && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg">
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-muted-foreground"
                      disabled
                      title="Disponible mas adelante"
                      type="button"
                    >
                      Mover pedido a mesa
                    </button>
                  </div>
                )}
              </div>
            ) : null
          }
          onActualizarCantidadItem={cambiarCantidadItem}
          onCerrarPedido={finalizarPedido}
          onCobroParcial={registrarCobroParcial}
          onConfirmarProductos={confirmarProductos}
          onEliminarItem={eliminarItem}
        />
      </div>
    </main>
  );
}
