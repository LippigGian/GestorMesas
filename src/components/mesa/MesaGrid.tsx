// import { useState, useEffect } from 'react';
// import { MesaCard } from './MesaCard';
// import { MesaDialog } from './MesaDialog';
// import type { Celda, Mesa } from '@/lib/types';
// import { v4 as uuidv4 } from 'uuid';
// import {
//   DndContext,
//   useDraggable,
//   useDroppable
// } from "@dnd-kit/core";
// import type { DragEndEvent } from "@dnd-kit/core";
// import { MesaDetalleDialog } from './MesaDetalleDialog';

// type Props = {
//   modoEdicion: boolean;
// };

// export function MesaGrid({ modoEdicion }: Props) {
 
//   const [cantidadFilas, setCantidadFilas] = useState(5);
//   const [cantidadColumnas, setCantidadColumnas] = useState(6);
//   const filas = cantidadFilas;
//   const columnas = cantidadColumnas;

  
// const [celdas, setCeldas] = useState<Celda[]>(
//   Array.from({ length: filas * columnas }, (_, i) => ({
//     x: i % columnas,
//     y: Math.floor(i / columnas),
//     mesa: undefined, // Si querés predefinir, podrías poner aquí una mesa mock con propiedades completas
//   }))
// );

//   // Estado para manejar las celdas por sector
// const [celdasPorSector, setCeldasPorSector] = useState<{
//   salon: Celda[];
//   deck: Celda[];
// }>({
//   salon: [],
//   deck: [],
// });

// //UseEffect para inicializar celdas por sector
// useEffect(() => {
//   const generarCeldas = () =>
//     Array.from({ length: cantidadFilas * cantidadColumnas }, (_, i) => ({
//       x: i % cantidadColumnas,
//       y: Math.floor(i / cantidadColumnas),
//     }));

//   setCeldasPorSector({
//     salon: generarCeldas(),
//     deck: generarCeldas(),
//   });
// }, [cantidadFilas, cantidadColumnas]);



// //Estados:
//   const [celdaSeleccionada, setCeldaSeleccionada] = useState<number | null>(null);
//   const [numeroMesa, setNumeroMesa] = useState('');
//   const [forma, setForma] = useState<'cuadrada' | 'redonda'>('cuadrada');
//   const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(null);
//   const [sectorActual, setSectorActual] = useState<'salon' | 'deck'>('salon');


// useEffect(() => {
//   setCeldas((prevCeldas) => {
//     const nuevasCeldas: Celda[] = Array.from(
//       { length: cantidadFilas * cantidadColumnas },
//       (_, i) => {
//         const x = i % cantidadColumnas;
//         const y = Math.floor(i / cantidadColumnas);

//         // Buscamos si ya había una celda en esa posición
//         const celdaAnterior = prevCeldas.find((c) => c.x === x && c.y === y);

//         return {
//           x,
//           y,
//           mesa: celdaAnterior?.mesa ?? undefined,
//         };
//       }
//     );
//     return nuevasCeldas;
//   });
// }, [cantidadFilas, cantidadColumnas]);
// //UseEFfect para mockear mesas:

// useEffect(() => {
// const mesasMockeadas: Celda[] = [
//   { x: 0, y: 0, mesa: { id: 'm1', numero: '1', tipo: 'cuadrada' } },
//   { x: 1, y: 0, mesa: { id: 'm2', numero: '2', tipo: 'redonda' } },
//   { x: 2, y: 1, mesa: { id: 'm3', numero: '3', tipo: 'cuadrada' } },
//   { x: 3, y: 1, mesa: { id: 'm4', numero: '4', tipo: 'redonda' } },
// ];


  
//   setCeldas((prevCeldas) =>
//     prevCeldas.map((celda) => {
//       const encontrada = mesasMockeadas.find(
//         (m) => m.x === celda.x && m.y === celda.y
//       );
//       return encontrada ?? celda;
//     })
//   );
// }, []);

// //Fin mock:

//   const handleAbrirDialogo = (index: number) => {
//     const mesa = celdas[index].mesa;
//     setCeldaSeleccionada(index);
//     setNumeroMesa(mesa?.numero ?? '');
//     setForma(mesa?.tipo ?? 'cuadrada');
//   };

//   const confirmarGuardarMesa = () => {
//     if (celdaSeleccionada === null || numeroMesa.trim() === '') return;

//     const yaExiste = celdas.some(
//       (c, i) => i !== celdaSeleccionada && c.mesa?.numero === numeroMesa.trim()
//     );

//     if (yaExiste) {
//       alert('Ya existe una mesa con ese número.');
//       return;
//     }

//     setCeldas((prev) =>
//       prev.map((celda, i) =>
//         i === celdaSeleccionada
//           ? {
//               ...celda,
//               mesa: {
//                 id: celda.mesa?.id ?? uuidv4(),
//                 numero: numeroMesa.trim(),
//                 tipo: forma,
//               },
//             }
//           : celda
//       )
//     );

//     setCeldaSeleccionada(null);
//     setNumeroMesa('');
//     setForma('cuadrada');
//   };

//   //Manejo drag and drop
// const handleDragEnd = (event: DragEndEvent) => {
//   const { active, over } = event;

//   if (!over || active.id === over.id) return;

//   const fromIndex = parseInt(active.id.toString());
//   const toIndex = parseInt(over.id.toString());

//   setCeldas((prev) => {
//     const updated = [...prev];

//     const mesaOrigen = updated[fromIndex].mesa;
//     const mesaDestino = updated[toIndex].mesa;

//     // Si no hay mesa en origen o ya hay mesa en destino, no hacemos nada
//     if (!mesaOrigen || mesaDestino) return prev;

//     updated[fromIndex].mesa = undefined;
//     updated[toIndex].mesa = mesaOrigen;

//     return updated;
//   });
// };




// function DraggableMesa({ id, children }: { id: string; children: React.ReactNode }) {
//   const { attributes, listeners, setNodeRef, transform } = useDraggable({
//     id,
//   });

//   const style = transform
//     ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
//     : undefined;

//   return (
//     <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
//       {children}
//     </div>
//   );
// }

// function DroppableCelda({ id, children }: { id: string; children: React.ReactNode }) {
//   const { setNodeRef } = useDroppable({ id });

  
//   return (
// <div
//   ref={setNodeRef}
//   className="border border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
//   style={{ width: 80, height: 80 }}
// >

//       {children}
//     </div>
//   );
// }

// //Modal MesaDetalle
// const ocuparMesa = (personas: number) => {
//   if (!mesaSeleccionada) return;

//   setCeldas((prev) =>
//     prev.map((celda) =>
//       celda.mesa?.id === mesaSeleccionada.id
//         ? {
//             ...celda,
//             mesa: {
//               ...celda.mesa,
//               estado: 'ocupada',
//               personas,
//               productos: [], // empieza vacía
//             },
//           }
//         : celda
//     )
//   );
//   setMesaSeleccionada(null);
// };

// const cerrarMesa = () => {
//   if (!mesaSeleccionada) return;

//   setCeldas((prev) =>
//     prev.map((celda) =>
//       celda.mesa?.id === mesaSeleccionada.id
//         ? {
//             ...celda,
//             mesa: {
//               ...celda.mesa,
//               estado: 'libre',
//               personas: 0,
//               productos: [],
//             },
//           }
//         : celda
//     )
//   );
//   setMesaSeleccionada(null);
// };

// const aplicarDescuento = () => {
//   if (!mesaSeleccionada) return;

//   setCeldas((prev) =>
//     prev.map((celda) =>
//       celda.mesa?.id === mesaSeleccionada.id
//         ? {
//             ...celda,
//             mesa: {
//               ...celda.mesa,
//               productos: celda.mesa.productos?.map((p) => ({
//                 ...p,
//                 precio: Math.round(p.precio * 0.9), // 10% descuento
//               })),
//             },
//           }
//         : celda
//     )
//   );
// };


// const mesaActual: Mesa | null =
//   mesaSeleccionada !== null && mesaSeleccionada >= 0 && mesaSeleccionada < celdas.length
//     ? celdas[mesaSeleccionada].mesa ?? null
//     : null;

//   return (
//   <div>
//     {modoEdicion && (
//       <div className="mb-4 flex gap-4">
//         <label className="flex flex-col text-sm">
//           Filas
//           <input
//             type="number"
//             min={1}
//             max={20}
//             value={cantidadFilas}
//             onChange={(e) => setCantidadFilas(Number(e.target.value))}
//             className="border p-1 rounded w-20"
//           />
//         </label>
//         <label className="flex flex-col text-sm">
//           Columnas
//           <input
//             type="number"
//             min={1}
//             max={20}
//             value={cantidadColumnas}
//             onChange={(e) => setCantidadColumnas(Number(e.target.value))}
//             className="border p-1 rounded w-20"
//           />
//         </label>
//       </div>
//     )}

//     <div
//       className={modoEdicion ? 'grid gap-1' : 'relative'}
//       style={
//         modoEdicion
//           ? {
//               gridTemplateColumns: `repeat(${columnas}, 80px)`,
//               gridTemplateRows: `repeat(${filas}, 80px)`,
//             }
//           : { height: filas * 80, width: columnas * 80 }
//       }
//     >
//       <DndContext onDragEnd={handleDragEnd}>
//         {celdas.map((celda, i) =>
//           modoEdicion ? (
//             <DroppableCelda key={i} id={i.toString()}>
//               {celda.mesa ? (
//                 <DraggableMesa id={i.toString()}>
//                   <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
//                 </DraggableMesa>
//               ) : (
//                 <span
//                   className="text-gray-400 grid"
//                   onClick={() => handleAbrirDialogo(i)}
//                 >
//                   +
//                 </span>
//               )}
//             </DroppableCelda>
//           ) : celda.mesa ? (
//             <div
//               key={i}
//               className="absolute"
//               style={{
//                 left: `${celda.x * 80}px`,
//                 top: `${celda.y * 80}px`,
//                 width: '80px',
//                 height: '80px',
//               }}
//              onClick={() => {
//     if (celda.mesa) setMesaSeleccionada(celda.mesa);
//   }}>
//               <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
//             </div>
//           ) : null
//         )}
//       </DndContext>

//       <MesaDialog
//         open={celdaSeleccionada !== null}
//         onClose={() => setCeldaSeleccionada(null)}
//         numeroMesa={numeroMesa}
//         forma={forma}
//         setNumeroMesa={setNumeroMesa}
//         setForma={setForma}
//         onConfirmar={confirmarGuardarMesa}
//         modoEdicion={modoEdicion}
//       />
//       <MesaDetalleDialog
//         open={mesaSeleccionada !== null}
//         onClose={() => setMesaSeleccionada(null)}
//         mesa={mesaActual}
//         onOcuparMesa={ocuparMesa}
//         onCerrarMesa={cerrarMesa}
//         onAplicarDescuento={aplicarDescuento}
//       />


//     </div>
//   </div>
// );

// }
// export default MesaGrid;

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
import {
  actualizarEstadoMesa,
  actualizarPosicionMesa,
  eliminarMesa,
  guardarMesa,
  obtenerMesas,
} from '@/services/mesasService';
import {
  confirmarProductosPedido,
  cerrarPedido,
  crearPedidoMesa,
  obtenerItemsPedido,
  obtenerPedidoAbiertoPorMesa,
  type ProductoPendientePedido,
} from '@/services/pedidosService';

type Props = {
  modoEdicion: boolean;
  sectorActual: 'salon' | 'deck';
};

const CELL_SIZE = 80;

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

export function MesaGrid({ modoEdicion, sectorActual }: Props) {
  const [cantidadFilas, setCantidadFilas] = useState(5);
  const [cantidadColumnas, setCantidadColumnas] = useState(6);

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

  // Actualiza grilla al cambiar filas/columnas
  useEffect(() => {
    setCeldasPorSector((prev) => ({
      salon: generarCeldas(cantidadFilas, cantidadColumnas, prev.salon),
      deck: generarCeldas(cantidadFilas, cantidadColumnas, prev.deck),
    }));
  }, [cantidadFilas, cantidadColumnas]);

  useEffect(() => {
    let mounted = true;

    async function cargarMesas() {
      try {
        setCargandoMesas(true);
        setErrorMesas(null);
        const mesas = await obtenerMesas();

        if (!mounted) {
          return;
        }

        setCeldasPorSector((prev) => ({
          salon: prev.salon.map((celda) => {
            const encontrada = mesas.find(
              (mesa) => mesa.sector === 'salon' && mesa.x === celda.x && mesa.y === celda.y
            );
            return encontrada ? { ...celda, mesa: encontrada } : celda;
          }),
          deck: prev.deck.map((celda) => {
            const encontrada = mesas.find(
              (mesa) => mesa.sector === 'deck' && mesa.x === celda.x && mesa.y === celda.y
            );
            return encontrada ? { ...celda, mesa: encontrada } : celda;
          }),
        }));
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
  }, []);

  const actualizarCeldas = (nuevas: Celda[]) => {
    setCeldasPorSector((prev) => ({
      ...prev,
      [sectorActual]: nuevas,
    }));
  };

  const handleAbrirDialogo = (index: number) => {
    const mesa = celdas[index].mesa;
    setCeldaSeleccionada(index);
    setNumeroMesa(mesa?.numero ?? '');
    setForma(mesa?.tipo ?? 'cuadrada');
  };

  const confirmarGuardarMesa = async () => {
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
      const pedido = await crearPedidoMesa(mesaSeleccionada.id, personas);
      setPedidoActivo(pedido);
      setPedidoItems([]);
      setMesaSeleccionada(mesaOcupada);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo ocupar la mesa');
      return;
    }

    const nuevas: Celda[] = celdas.map((celda) =>
      celda.mesa?.id === mesaSeleccionada.id
        ? {
            ...celda,
            mesa: mesaOcupada,
          }
        : celda
    );
    actualizarCeldas(nuevas);
  };

  const cerrarMesa = async () => {
    if (!mesaSeleccionada) return;
    try {
      setErrorMesas(null);
      if (pedidoActivo) {
        await cerrarPedido(pedidoActivo.id);
      }
      await actualizarEstadoMesa(mesaSeleccionada.id, 'libre', 0);
    } catch (err) {
      setErrorMesas(err instanceof Error ? err.message : 'No se pudo cerrar la mesa');
      return;
    }

    const nuevas: Celda[] = celdas.map((celda) =>
      celda.mesa?.id === mesaSeleccionada.id
        ? {
            ...celda,
            mesa: {
              ...celda.mesa,
              estado: 'libre',
              personas: 0,
              productos: [],
            },
          }
        : celda
    );
    actualizarCeldas(nuevas);
    setMesaSeleccionada(null);
    setPedidoActivo(null);
    setPedidoItems([]);
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

  const aplicarDescuento = () => {
    if (!mesaSeleccionada) return;
    const nuevas = celdas.map((celda) =>
      celda.mesa?.id === mesaSeleccionada.id
        ? {
            ...celda,
            mesa: {
              ...celda.mesa,
              productos: celda.mesa.productos?.map((p) => ({
                ...p,
                precio: Math.round(p.precio * 0.9),
              })),
            },
          }
        : celda
    );
    actualizarCeldas(nuevas);
  };

  const mesaActual: Mesa | null = mesaSeleccionada ?? null;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
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
              min={1}
              value={cantidadFilas}
              onChange={(e) => setCantidadFilas(normalizarDimension(Number(e.target.value)))}
              className="mt-1 w-20 rounded-md border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-foreground">
            Columnas
            <input
              type="number"
              min={1}
              value={cantidadColumnas}
              onChange={(e) => setCantidadColumnas(normalizarDimension(Number(e.target.value)))}
              className="mt-1 w-20 rounded-md border bg-background px-2 py-1 text-foreground"
            />
          </label>
        </div>
      )}

      <div
        className={modoEdicion ? 'grid gap-1' : 'relative'}
        style={
          modoEdicion
            ? {
                gridTemplateColumns: `repeat(${cantidadColumnas}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${cantidadFilas}, ${CELL_SIZE}px)`,
              }
            : { height: cantidadFilas * CELL_SIZE, width: cantidadColumnas * CELL_SIZE }
        }
      >
        <DndContext onDragEnd={handleDragEnd}>
          {celdas.map((celda, i) =>
            modoEdicion ? (
              <DroppableCelda key={i} id={i.toString()}>
                {celda.mesa ? (
                  <div className="relative h-full w-full">
                    <DraggableMesa id={i.toString()}>
                      <MesaCard
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
                        className="h-6 w-6 shadow-sm"
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
                className="absolute"
                style={{
                  left: `${celda.x * CELL_SIZE}px`,
                  top: `${celda.y * CELL_SIZE}px`,
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

        <MesaDetalleDialog
          open={mesaSeleccionada !== null}
          onClose={() => {
            setMesaSeleccionada(null);
            setPedidoActivo(null);
            setPedidoItems([]);
          }}
          mesa={mesaActual}
          pedido={pedidoActivo}
          pedidoItems={pedidoItems}
          onConfirmarProductos={confirmarProductosMesa}
          onOcuparMesa={ocuparMesa}
          onCerrarMesa={cerrarMesa}
          onAplicarDescuento={aplicarDescuento}
        />
      </div>
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
