import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CerrarPedidoDialog } from '@/components/pedidos/CerrarPedidoDialog';
import { useCatalogo } from '@/context/CatalogoContext';
import type { Pedido, PedidoItem, Producto } from '@/lib/types';
import {
  actualizarCantidadItemPedido,
  actualizarClientePedido,
  cerrarPedido,
  confirmarProductosPedido,
  crearPedidoMostrador,
  eliminarItemPedido,
  obtenerItemsPedido,
  obtenerPedidosMostradorAbiertos,
  type PagoPedidoInput,
  type ProductoPendientePedido,
} from '@/services/pedidosService';

function normalizarBusqueda(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLocaleLowerCase();
}

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
  const [itemsPendientes, setItemsPendientes] = useState<ProductoPendientePedido[]>([]);
  const [cliente, setCliente] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [itemActualizandoId, setItemActualizandoId] = useState<string | null>(null);
  const [mostrandoCierre, setMostrandoCierre] = useState(false);
  const [errorMostrador, setErrorMostrador] = useState<string | null>(null);
  const { cargando: cargandoCatalogo, error: errorCatalogo, productosActivos } = useCatalogo();

  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const productosDisponibles = productosActivos.filter((producto) =>
    normalizarBusqueda(producto.nombre).includes(busquedaNormalizada)
  );
  const totalPendiente = itemsPendientes.reduce(
    (acc, item) => acc + item.precioUnitario * item.cantidad,
    0
  );
  const totalConfirmado =
    pedidoSeleccionado?.total ?? pedidoItems.reduce((acc, item) => acc + item.subtotal, 0);
  const total = totalConfirmado + totalPendiente;

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
      setItemsPendientes([]);
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
      setItemsPendientes([]);
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
    if (!pedidoSeleccionado || itemsPendientes.length === 0) return;

    try {
      setGuardando(true);
      setErrorMostrador(null);
      const items = await confirmarProductosPedido(pedidoSeleccionado.id, itemsPendientes);
      actualizarTotalPedidoActivo(items);
      setItemsPendientes([]);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarCantidadItem = async (item: PedidoItem, cantidad: number) => {
    if (!pedidoSeleccionado) return;

    try {
      setItemActualizandoId(item.id);
      setErrorMostrador(null);
      const items = await actualizarCantidadItemPedido(pedidoSeleccionado.id, item, cantidad);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo actualizar el producto');
    } finally {
      setItemActualizandoId(null);
    }
  };

  const eliminarItem = async (item: PedidoItem) => {
    if (!pedidoSeleccionado || !window.confirm(`Eliminar ${item.nombreProducto} del pedido?`)) {
      return;
    }

    try {
      setItemActualizandoId(item.id);
      setErrorMostrador(null);
      const items = await eliminarItemPedido(pedidoSeleccionado.id, item.id);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo eliminar el producto');
    } finally {
      setItemActualizandoId(null);
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
      setItemsPendientes([]);
      setCliente('');
      setMostrandoCierre(false);
    } catch (err) {
      setErrorMostrador(err instanceof Error ? err.message : 'No se pudo finalizar el pedido');
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

        <aside className="flex min-h-[560px] w-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:w-[460px] xl:w-[520px]">
          <div className="border-b bg-primary px-4 py-3 text-primary-foreground">
            <h3 className="text-lg font-bold">
              {pedidoSeleccionado ? crearTituloPedido(pedidoSeleccionado) : 'Mostrador'}
            </h3>
          </div>

          {pedidoSeleccionado ? (
            <>
              <div className="space-y-3 border-b p-4">
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
                        disabled={guardando}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setItemsPendientes([])}
                      >
                        Cancelar carga
                      </Button>
                      <Button
                        disabled={guardando}
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
                  <h4 className="mb-2 text-sm font-semibold">Agregar productos</h4>

                  {errorCatalogo && (
                    <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                      {errorCatalogo}
                    </div>
                  )}

                  <Input
                    className="mb-2"
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />

                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                    {cargandoCatalogo ? (
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

              <div className="flex justify-end border-t p-4">
                <Button
                  disabled={guardando}
                  variant="destructive"
                  onClick={() => setMostrandoCierre(true)}
                >
                  Finalizar Pedido
                </Button>
              </div>
              <CerrarPedidoDialog
                items={pedidoItems}
                open={mostrandoCierre}
                titulo="Cerrar pedido de mostrador"
                total={totalConfirmado}
                onClose={() => setMostrandoCierre(false)}
                onConfirmar={finalizarPedido}
              />
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6 text-center">
              <div>
                <p className="text-lg font-semibold text-foreground">Selecciona un pedido</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O crea uno nuevo para empezar a cargar productos.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
