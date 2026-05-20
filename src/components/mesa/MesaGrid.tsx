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
import { v4 as uuidv4 } from 'uuid';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

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

  const celdas = celdasPorSector[sectorActual] || [];

  // Actualiza grilla al cambiar filas/columnas
  useEffect(() => {
    setCeldasPorSector((prev) => ({
      salon: generarCeldas(cantidadFilas, cantidadColumnas, prev.salon),
      deck: generarCeldas(cantidadFilas, cantidadColumnas, prev.deck),
    }));
  }, [cantidadFilas, cantidadColumnas]);

  // Mock inicial
  useEffect(() => {
    const mesasSalon: Celda[] = [
    { x: 0, y: 0, mesa: { id: 's1', numero: '1', tipo: 'cuadrada' } },
    { x: 1, y: 0, mesa: { id: 's2', numero: '2', tipo: 'redonda' } },
    { x: 2, y: 1, mesa: { id: 's3', numero: '3', tipo: 'cuadrada' } },
  ];

  const mesasDeck: Celda[] = [
    { x: 0, y: 0, mesa: { id: 'd1', numero: '101', tipo: 'redonda' } },
    { x: 1, y: 0, mesa: { id: 'd2', numero: '102', tipo: 'cuadrada' } },
    { x: 2, y: 1, mesa: { id: 'd3', numero: '103', tipo: 'redonda' } },
  ];

  //   setCeldasPorSector((prev) => ({
  //     ...prev,
  //     salon: prev.salon.map((celda) => {
  //       const encontrada = mesasMockeadas.find((m) => m.x === celda.x && m.y === celda.y);
  //       return encontrada ?? celda;
  //     }),
  //   }));
  // }, []);
  setCeldasPorSector((prev) => ({
    salon: prev.salon.map((celda) => {
      const encontrada = mesasSalon.find((m) => m.x === celda.x && m.y === celda.y);
      return encontrada ?? celda;
    }),
    deck: prev.deck.map((celda) => {
      const encontrada = mesasDeck.find((m) => m.x === celda.x && m.y === celda.y);
      return encontrada ?? celda;
    }),
  }));
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

  const confirmarGuardarMesa = () => {
    if (celdaSeleccionada === null || numeroMesa.trim() === '') return;

    const yaExiste = celdas.some(
      (c, i) => i !== celdaSeleccionada && c.mesa?.numero === numeroMesa.trim()
    );
    if (yaExiste) {
      alert('Ya existe una mesa con ese número.');
      return;
    }

    const nuevasCeldas = celdas.map((celda, i) =>
      i === celdaSeleccionada
        ? {
            ...celda,
            mesa: {
              id: celda.mesa?.id ?? uuidv4(),
              numero: numeroMesa.trim(),
              tipo: forma,
            },
          }
        : celda
    );

    actualizarCeldas(nuevasCeldas);
    setCeldaSeleccionada(null);
    setNumeroMesa('');
    setForma('cuadrada');
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
  };

  const ocuparMesa = (personas: number) => {
    if (!mesaSeleccionada) return;
    const nuevas: Celda[] = celdas.map((celda) =>
      celda.mesa?.id === mesaSeleccionada.id
        ? {
            ...celda,
            mesa: {
              ...celda.mesa,
              estado: 'ocupada',
              personas,
              productos: [],
            },
          }
        : celda
    );
    actualizarCeldas(nuevas);
    setMesaSeleccionada(null);
  };

  const cerrarMesa = () => {
    if (!mesaSeleccionada) return;
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
    <div>
      {modoEdicion && (
        <div className="mb-4 flex gap-4">
          <label className="flex flex-col text-sm">
            Filas
            <input
              type="number"
              min={1}
              value={cantidadFilas}
              onChange={(e) => setCantidadFilas(normalizarDimension(Number(e.target.value)))}
              className="border p-1 rounded w-20"
            />
          </label>
          <label className="flex flex-col text-sm">
            Columnas
            <input
              type="number"
              min={1}
              value={cantidadColumnas}
              onChange={(e) => setCantidadColumnas(normalizarDimension(Number(e.target.value)))}
              className="border p-1 rounded w-20"
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
                  <DraggableMesa id={i.toString()}>
                    <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
                  </DraggableMesa>
                ) : (
                  <span
                    className="text-gray-400 grid"
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
                  setMesaSeleccionada(celda.mesa!);
                }}
              >
                <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
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
          onClose={() => setMesaSeleccionada(null)}
          mesa={mesaActual}
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
      className="border border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
      style={{ width: CELL_SIZE, height: CELL_SIZE }}
    >
      {children}
    </div>
  );
}
