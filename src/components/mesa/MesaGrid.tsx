import { useState, useEffect } from 'react';
import { MesaCard } from './MesaCard';
import { MesaDialog } from './MesaDialog';
import { MesaDetalleDialog } from './MesaDetalleDialog';
import type { Celda, Mesa } from '@/lib/types';
import type { Pedido, PedidoItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useLocal } from '@/context/LocalContext';
import {
  actualizarEstadoMesa,
  actualizarPosicionMesa,
  eliminarMesa,
  guardarMesa,
  obtenerMesas,
} from '@/services/mesasService';
import {
  actualizarCantidadItemPedido,
  actualizarPersonasPedido,
  aplicarDescuentoPedido,
  confirmarProductosPedido,
  cerrarPedido,
  crearPedidoMesa,
  eliminarItemPedido,
  obtenerItemsPedido,
  obtenerPedidoAbiertoPorMesa,
  registrarPagoParcialPedido,
  type DescuentoPedidoInput,
  type PagoPedidoInput,
  type ProductoPendientePedido,
} from '@/services/pedidosService';

type Props = {
  modoEdicion: boolean;
  sectorActual: 'salon' | 'deck';
};

const CELL_SIZE = 80;
const CELL_STEP = 112;
const GRID_ROWS_STORAGE_KEY = 'mesas-grid-filas';
const GRID_COLUMNS_STORAGE_KEY = 'mesas-grid-columnas';

function leerDimensionGuardada(key: string, fallback: number) {
  if (typeof window === 'undefined') return fallback;

  const value = Number(window.localStorage.getItem(key));
  return normalizarDimension(value || fallback);
}

function generarCeldas(
  cantidadFilas: number,
  cantidadColumnas: number,
  celdasAnteriores: Celda[] = []
): Celda[] {
  return Array.from({ length: cantidadFilas * cantidadColumnas }, (_, i) => {
    const x = i % cantidadColumnas;
    const y = Math.floor(i / cantidadColumnas);
    const celdaAnterior = celdasAnteriores.find((celda) => celda.x === x && celda.y === y);

    return {
      x,
      y,
      mesa: celdaAnterior?.mesa,
    };
  });
}

function normalizarDimension(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function normalizarNumeroMesa(numero: string) {
  return numero.trim().toLocaleLowerCase();
}

function obtenerDimensionesMinimas(celdasPorSector: { salon: Celda[]; deck: Celda[] }) {
  const mesas = Object.values(celdasPorSector)
    .flat()
    .filter((celda) => celda.mesa);

  return {
    filas: Math.max(1, ...mesas.map((celda) => celda.y + 1)),
    columnas: Math.max(1, ...mesas.map((celda) => celda.x + 1)),
  };
}

function ubicarMesasEnCeldas(
  celdas: Celda[],
  mesas: Awaited<ReturnType<typeof obtenerMesas>>,
  sector: 'salon' | 'deck'
) {
  return celdas.map((celda) => {
    const encontrada = mesas.find(
      (mesa) => mesa.sector === sector && mesa.x === celda.x && mesa.y === celda.y
    );

    return encontrada ? { ...celda, mesa: encontrada } : celda;
  });
}

export function MesaGrid({ modoEdicion, sectorActual }: Props) {
  const { cargandoLocal, errorLocal, localId } = useLocal();
  const [cantidadFilas, setCantidadFilas] = useState(() =>
    leerDimensionGuardada(GRID_ROWS_STORAGE_KEY, 5)
  );
  const [cantidadColumnas, setCantidadColumnas] = useState(() =>
    leerDimensionGuardada(GRID_COLUMNS_STORAGE_KEY, 6)
  );

  const [celdasPorSector, setCeldasPorSector] = useState<{
    salon: Celda[];
    deck: Celda[];
  }>({
    salon: [],
    deck: [],
  });

  const [celdaSeleccionada, setCeldaSeleccionada] = useState<number | null>(null);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [forma, setForma] = useState<'cuadrada' | 'redonda'>('cuadrada');
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [pedidoItems, setPedidoItems] = useState<PedidoItem[]>([]);
  const [cargandoMesas, setCargandoMesas] = useState(true);
  const [errorMesas, setErrorMesas] = useState<string | null>(null);

  const celdas = celdasPorSector[sectorActual] || [];
  const dimensionesMinimas = obtenerDimensionesMinimas(celdasPorSector);

  useEffect(() => {
    window.localStorage.setItem(GRID_ROWS_STORAGE_KEY, String(cantidadFilas));
  }, [cantidadFilas]);

  useEffect(() => {
    window.localStorage.setItem(GRID_COLUMNS_STORAGE_KEY, String(cantidadColumnas));
  }, [cantidadColumnas]);

  // Actualiza grilla al cambiar filas/columnas
  useEffect(() => {
    setCeldasPorSector((prev) => ({
      salon: generarCeldas(cantidadFilas, cantidadColumnas, prev.salon),
      deck: generarCeldas(cantidadFilas, cantidadColumnas, prev.deck),
    }));
  }, [cantidadFilas, cantidadColumnas]);

  useEffect(() => {
    if (cargandoLocal) return;

    if (!localId) {
      setCargandoMesas(false);
      setErrorMesas(errorLocal ?? 'No hay un local activo configurado.');
      return;
    }

    const localIdActual = localId;
    let mounted = true;

    async function cargarMesas() {
      try {
        setCargandoMesas(true);
        setErrorMesas(null);
        const mesas = await obtenerMesas(localIdActual);

        if (!mounted) {
          return;
        }

        const filasNecesarias = Math.max(1, ...mesas.map((mesa) => mesa.y + 1));
        const columnasNecesarias = Math.max(1, ...mesas.map((mesa) => mesa.x + 1));
        const filasObjetivo = Math.max(cantidadFilas, filasNecesarias);
        const columnasObjetivo = Math.max(cantidadColumnas, columnasNecesarias);
        const salon = generarCeldas(filasObjetivo, columnasObjetivo);
        const deck = generarCeldas(filasObjetivo, columnasObjetivo);

        setCantidadFilas(filasObjetivo);
        setCantidadColumnas(columnasObjetivo);
        setCeldasPorSector({
          salon: ubicarMesasEnCeldas(salon, mesas, 'salon'),
          deck: ubicarMesasEnCeldas(deck, mesas, 'deck'),
        });
      } catch (err) {
        if (mounted) {
          setErrorMesas(err instanceof Error ? err.message : 'No se pudieron cargar las mesas');
        }
      } finally {
        if (mounted) {
          setCargandoMesas(false);
        }
      }
    }

    cargarMesas();

    return () => {
      mounted = false;
    };
  }, [cargandoLocal, errorLocal, localId]);

  const actualizarCeldas = (nuevas: Celda[]) => {
    setCeldasPorSector((prev) => ({
      ...prev,
      [sectorActual]: nuevas,
    }));
  };

  const actualizarMesaEnSectores = (mesaActualizada: Mesa) => {
    setCeldasPorSector((prev) => ({
      salon: prev.salon.map((celda) =>
        celda.mesa?.id === mesaActualizada.id ? { ...celda, mesa: mesaActualizada } : celda
      ),
      deck: prev.deck.map((celda) =>
        celda.mesa?.id === mesaActualizada.id ? { ...celda, mesa: mesaActualizada } : celda
      ),
    }));
  };

  const handleAbrirDialogo = (index: number) => {
    const mesa = celdas[index].mesa;
    setCeldaSeleccionada(index);
    setNumeroMesa(mesa?.numero ?? '');
    setForma(mesa?.tipo ?? 'cuadrada');
  };

  const confirmarGuardarMesa = async () => {
    if (!localId) {
      setErrorMesas('No hay un local activo configurado.');
      return;
    }

    if (celdaSeleccionada === null || numeroMesa.trim() === '') return;

    const celdaActual = celdas[celdaSeleccionada];
    const mesaEditandoId = celdaActual.mesa?.id;
    const numeroNormalizado = normalizarNumeroMesa(numeroMesa);
    const yaExiste = Object.values(celdasPorSector).some((celdasSector) =>
      celdasSector.some(
        (celda) =>
          celda.mesa &&
          celda.mesa.id !== mesaEditandoId &&
          normalizarNumeroMesa(celda.mesa.numero) === numeroNormalizado
      )
    );

    if (yaExiste) {
      alert('Ya existe una mesa con ese numero.');
      return;
    }

    try {
      setErrorMesas(null);
      const mesaGuardada = await guardarMesa({
        id: celdaActual.mesa?.id ?? uuidv4(),
        localId,
        numero: numeroMesa.trim(),
        tipo: forma,
        estado: celdaActual.mesa?.estado ?? 'libre',
        personas: celdaActual.mesa?.personas ?? 0,
        productos: celdaActual.mesa?.productos ?? [],
        sector: sectorActual,
        x: celdaActual.x,
        y: celdaActual.y,
      });

      const nuevasCeldas = celdas.map((celda, i) =>
        i === celdaSeleccionada ? { ...celda, mesa: mesaGuardada } : celda
      );

      actualizarCeldas(nuevasCeldas);
      setCeldaSeleccionada(null);
      setNumeroMesa('');
      setForma('cuadrada');
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo guardar la mesa');
    }
  };

  const abrirMesa = async (mesa: Mesa) => {
    setMesaSeleccionada(mesa);
    setPedidoActivo(null);
    setPedidoItems([]);

    if (mesa.estado !== 'ocupada') {
      return;
    }

    try {
      setErrorMesas(null);
      const pedido = await obtenerPedidoAbiertoPorMesa(mesa.id);
      setPedidoActivo(pedido);
      setPedidoItems(pedido ? await obtenerItemsPedido(pedido.id) : []);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
    }
  };

  const borrarMesa = async (index: number) => {
    const mesa = celdas[index].mesa;
    if (!mesa) return;

    if (mesa.estado === 'ocupada') {
      setErrorMesas('No se puede eliminar una mesa ocupada.');
      return;
    }

    if (!window.confirm(`Eliminar la mesa ${mesa.numero}?`)) {
      return;
    }

    try {
      setErrorMesas(null);
      await eliminarMesa(mesa.id);
      actualizarCeldas(celdas.map((celda, i) => (i === index ? { ...celda, mesa: undefined } : celda)));
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo eliminar la mesa');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = parseInt(active.id.toString());
    const to = parseInt(over.id.toString());

    const updated = [...celdas];
    const mesaOrigen = updated[from].mesa;
    const mesaDestino = updated[to].mesa;

    if (!mesaOrigen || mesaDestino) return;
    updated[from].mesa = undefined;
    updated[to].mesa = mesaOrigen;

    actualizarCeldas(updated);
    await actualizarPosicionMesa(mesaOrigen.id, sectorActual, updated[to].x, updated[to].y);
  };

  const ocuparMesa = async (personas: number) => {
    if (!localId) {
      setErrorMesas('No hay un local activo configurado.');
      return;
    }

    if (!mesaSeleccionada) return;

    const mesaOcupada: Mesa = {
      ...mesaSeleccionada,
      estado: 'ocupada',
      personas,
      productos: [],
    };

    try {
      setErrorMesas(null);
      await actualizarEstadoMesa(mesaSeleccionada.id, 'ocupada', personas);
      const pedido = await crearPedidoMesa(mesaSeleccionada.id, personas, localId);
      setPedidoActivo(pedido);
      setPedidoItems([]);
      setMesaSeleccionada(mesaOcupada);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo ocupar la mesa');
      return;
    }

    actualizarMesaEnSectores(mesaOcupada);
  };

  const actualizarPersonasMesa = async (personas: number) => {
    if (!mesaSeleccionada) return;

    const mesaActualizada: Mesa = {
      ...mesaSeleccionada,
      personas,
    };

    try {
      setErrorMesas(null);
      await actualizarEstadoMesa(mesaSeleccionada.id, 'ocupada', personas);
      if (pedidoActivo) {
        const pedidoActualizado = await actualizarPersonasPedido(pedidoActivo.id, personas);
        setPedidoActivo(pedidoActualizado);
      }
      setMesaSeleccionada(mesaActualizada);
      actualizarMesaEnSectores(mesaActualizada);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo actualizar la mesa');
      throw err;
    }
  };

  const cerrarMesa = async (pagos: PagoPedidoInput[]) => {
    if (!mesaSeleccionada) return;
    if (!localId) {
      setErrorMesas('No hay un local activo configurado.');
      return;
    }

    try {
      setErrorMesas(null);
      if (pedidoActivo) {
        await cerrarPedido(pedidoActivo.id, pagos, localId);
      }
      await actualizarEstadoMesa(mesaSeleccionada.id, 'libre', 0);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo cerrar la mesa');
      return;
    }

    actualizarMesaEnSectores({
      ...mesaSeleccionada,
      estado: 'libre',
      personas: 0,
      productos: [],
    });
    setMesaSeleccionada(null);
    setPedidoActivo(null);
    setPedidoItems([]);
  };

  const registrarCobroParcialMesa = async (pagos: PagoPedidoInput[]) => {
    if (!pedidoActivo) return;
    if (!localId) {
      setErrorMesas('No hay un local activo configurado.');
      return;
    }

    try {
      setErrorMesas(null);
      await registrarPagoParcialPedido(pedidoActivo.id, pagos, localId);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo registrar el cobro parcial');
      throw err;
    }
  };

  const confirmarProductosMesa = async (productos: ProductoPendientePedido[]) => {
    if (!pedidoActivo) return;

    try {
      setErrorMesas(null);
      const items = await confirmarProductosPedido(pedidoActivo.id, productos);
      setPedidoItems(items);
      setPedidoActivo((prev) =>
        prev
          ? {
              ...prev,
              total: items.reduce((acc, item) => acc + item.subtotal, 0),
            }
          : prev
      );
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
      throw err;
    }
  };

  const actualizarTotalPedidoActivo = (items: PedidoItem[]) => {
    setPedidoItems(items);
    setPedidoActivo((prev) =>
      prev
        ? {
            ...prev,
            total: items.reduce((acc, item) => acc + item.subtotal, 0),
          }
        : prev
    );
  };

  const actualizarCantidadPedidoItem = async (item: PedidoItem, cantidad: number) => {
    if (!pedidoActivo) return;

    try {
      setErrorMesas(null);
      const items = await actualizarCantidadItemPedido(pedidoActivo.id, item, cantidad);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo actualizar el producto');
      throw err;
    }
  };

  const eliminarPedidoItem = async (itemId: string) => {
    if (!pedidoActivo) return;

    try {
      setErrorMesas(null);
      const items = await eliminarItemPedido(pedidoActivo.id, itemId);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo eliminar el producto');
      throw err;
    }
  };

  const aplicarDescuento = async (descuento: DescuentoPedidoInput) => {
    if (!pedidoActivo) return;

    try {
      setErrorMesas(null);
      const items = await aplicarDescuentoPedido(pedidoActivo.id, descuento);
      actualizarTotalPedidoActivo(items);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo aplicar el descuento');
      throw err;
    }
  };

  const mesaActual: Mesa | null = mesaSeleccionada ?? null;
  const cambiarCantidadFilas = (value: number) => {
    setCantidadFilas(Math.max(normalizarDimension(value), dimensionesMinimas.filas));
  };

  const cambiarCantidadColumnas = (value: number) => {
    setCantidadColumnas(Math.max(normalizarDimension(value), dimensionesMinimas.columnas));
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <section className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-card p-4 shadow-sm">
        {errorMesas && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMesas}
          </div>
        )}
        {cargandoMesas && (
          <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            Cargando mesas...
          </div>
        )}

        {modoEdicion && (
          <div className="mb-4 flex gap-4 rounded-md border bg-muted/40 p-3">
            <label className="flex flex-col text-sm font-medium text-foreground">
              Filas
              <input
                type="number"
                min={dimensionesMinimas.filas}
                value={cantidadFilas}
                onChange={(e) => cambiarCantidadFilas(Number(e.target.value))}
                className="mt-1 w-20 rounded-md border bg-background px-2 py-1 text-foreground"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-foreground">
              Columnas
              <input
                type="number"
                min={dimensionesMinimas.columnas}
                value={cantidadColumnas}
                onChange={(e) => cambiarCantidadColumnas(Number(e.target.value))}
                className="mt-1 w-20 rounded-md border bg-background px-2 py-1 text-foreground"
              />
            </label>
          </div>
        )}

        <div
          className={modoEdicion ? 'grid gap-4' : 'relative'}
          style={
            modoEdicion
              ? {
                  gridTemplateColumns: `repeat(${cantidadColumnas}, ${CELL_SIZE}px)`,
                  gridTemplateRows: `repeat(${cantidadFilas}, ${CELL_SIZE}px)`,
                }
              : { height: cantidadFilas * CELL_STEP, width: cantidadColumnas * CELL_STEP }
          }
        >
          <DndContext onDragEnd={handleDragEnd}>
            {celdas.map((celda, i) =>
              modoEdicion ? (
                <DroppableCelda key={i} id={i.toString()}>
                  {celda.mesa ? (
                    <div className="relative h-full w-full">
                      <DraggableMesa id={i.toString()}>
                        <MesaMiniatura
                          numero={celda.mesa.numero}
                          tipo={celda.mesa.tipo}
                          estado={celda.mesa.estado}
                        />
                      </DraggableMesa>
                      <div className="absolute right-1 top-1 flex gap-1">
                        <Button
                          className="h-6 w-6 bg-background/90 text-foreground shadow-sm"
                          size="icon"
                          type="button"
                          variant="outline"
                          title="Editar mesa"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAbrirDialogo(i);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          className="h-6 w-6 shadow-sm hover:bg-red-700 hover:text-white hover:ring-2 hover:ring-red-300"
                          size="icon"
                          type="button"
                          variant="destructive"
                          title="Eliminar mesa"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            borrarMesa(i);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className="grid h-full w-full place-items-center text-2xl font-medium text-muted-foreground transition hover:bg-accent/20 hover:text-primary"
                      onClick={() => handleAbrirDialogo(i)}
                    >
                      +
                    </span>
                  )}
                </DroppableCelda>
              ) : celda.mesa ? (
                <div
                  key={i}
                  className={`absolute rounded-lg ${
                    mesaSeleccionada?.id === celda.mesa.id ? 'ring-4 ring-accent' : ''
                  }`}
                  style={{
                    left: `${celda.x * CELL_STEP}px`,
                    top: `${celda.y * CELL_STEP}px`,
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                  }}
                  onClick={() => {
                    abrirMesa(celda.mesa!);
                  }}
                >
                  <MesaCard
                    numero={celda.mesa.numero}
                    tipo={celda.mesa.tipo}
                    estado={celda.mesa.estado}
                  />
                </div>
              ) : null
            )}
          </DndContext>

          <MesaDialog
            open={celdaSeleccionada !== null}
            onClose={() => setCeldaSeleccionada(null)}
            numeroMesa={numeroMesa}
            forma={forma}
            setNumeroMesa={setNumeroMesa}
            setForma={setForma}
            onConfirmar={confirmarGuardarMesa}
            modoEdicion={modoEdicion}
          />
        </div>
      </section>

      <MesaDetalleDialog
        mesa={mesaActual}
        pedido={pedidoActivo}
        pedidoItems={pedidoItems}
        onConfirmarProductos={confirmarProductosMesa}
        onActualizarCantidadItem={actualizarCantidadPedidoItem}
        onEliminarItem={eliminarPedidoItem}
        onActualizarPersonas={actualizarPersonasMesa}
        onOcuparMesa={ocuparMesa}
        onCobroParcial={registrarCobroParcialMesa}
        onCerrarMesa={cerrarMesa}
        onAplicarDescuento={aplicarDescuento}
      />
    </div>
  );
}

function DraggableMesa({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

function DroppableCelda({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="flex cursor-pointer items-center justify-center border border-border bg-muted/40 transition hover:bg-accent/20"
      style={{ width: CELL_SIZE, height: CELL_SIZE }}
    >
      {children}
    </div>
  );
}

function MesaMiniatura({
  numero,
  tipo,
  estado = 'libre',
}: {
  numero: string;
  tipo: 'cuadrada' | 'redonda';
  estado?: 'libre' | 'ocupada';
}) {
  const colorEstado =
    estado === 'ocupada'
      ? 'border-red-300 bg-red-100 text-red-800'
      : 'border-emerald-300 bg-emerald-100 text-emerald-800';

  return (
    <div className="grid h-full w-full place-items-center p-2">
      <div
        className={`grid h-14 w-14 place-items-center border text-lg font-bold shadow-sm ${
          tipo === 'redonda' ? 'rounded-full' : 'rounded-md'
        } ${colorEstado}`}
      >
        {numero}
      </div>
    </div>
  );
}
