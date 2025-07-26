// import React, { useState } from 'react';
// import { MesaCard } from './MesaCard';
// import { MesaDialog } from './MesaDialog';
// import type { Celda } from '@/lib/types';

// type Props = {
//   modoEdicion: boolean;
// };

// export function MesaGrid({ modoEdicion }: Props) {
//   const filas = 5;
//   const columnas = 6;

//   const [celdas, setCeldas] = useState<Celda[]>(
//     Array.from({ length: filas * columnas }, (_, i) => ({
//       x: i % columnas,
//       y: Math.floor(i / columnas),
//     }))
//   );

//   const [celdaSeleccionada, setCeldaSeleccionada] = useState<number | null>(null);
//   const [numeroMesa, setNumeroMesa] = useState('');
//   const [forma, setForma] = useState<'cuadrada' | 'redonda'>('cuadrada');

//   const confirmarAgregarMesa = () => {
//   if (celdaSeleccionada === null || numeroMesa.trim() === '') return;

//   // Verificamos si ya existe una mesa con ese número
//   const yaExiste = celdas.some(
//     (c, i) => i !== celdaSeleccionada && c.mesa?.numero === numeroMesa.trim()
//   );

//   if (yaExiste) {
//     alert('Ya existe una mesa con ese número. Elegí otro.');
//     return;
//   }

// setCeldas((prev) =>
//   prev.map((celda, i) =>
//     i === celdaSeleccionada
//       ? {
//           ...celda,
//           mesa: {
//             id: crypto.randomUUID(), // ✅ Genera un id único
//             numero: numeroMesa.trim(),
//             tipo: forma,
//           },
//         }
//       : celda
//   )
// );


//   setCeldaSeleccionada(null);
//   setNumeroMesa('');
//   setForma('cuadrada');
// };
//   return (
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
//       {celdas.map((celda, i) =>
//         modoEdicion ? (
//           <div
//             key={`${celda.x}-${celda.y}`}
//             className="border border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
//             onClick={() => {
//               if (!celda.mesa) setCeldaSeleccionada(i);
//             }}
//           >
//             {celda.mesa ? (
//               <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
//             ) : (
//               <span className="text-gray-400">+</span>
//             )}
//           </div>
//         ) : celda.mesa ? (
//           <div
//             key={`${celda.x}-${celda.y}`}
//             className="absolute"
//             style={{
//               left: `${celda.x * 80}px`,
//               top: `${celda.y * 80}px`,
//               width: '80px',
//               height: '80px',
//             }}
//           >
//             <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
//           </div>
//         ) : null
//       )}

//       {/* Modal */}
//       <MesaDialog
//         open={celdaSeleccionada !== null}
//         onClose={() => setCeldaSeleccionada(null)}
//         numeroMesa={numeroMesa}
//         forma={forma}
//         setNumeroMesa={setNumeroMesa}
//         setForma={setForma}
//         onConfirmar={confirmarAgregarMesa}
//       />
//     </div>
//   );
// }


import { useState, useEffect } from 'react';
import { MesaCard } from './MesaCard';
import { MesaDialog } from './MesaDialog';
import type { Celda, Mesa } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";

type Props = {
  modoEdicion: boolean;
};

export function MesaGrid({ modoEdicion }: Props) {
 
  const [cantidadFilas, setCantidadFilas] = useState(5);
  const [cantidadColumnas, setCantidadColumnas] = useState(6);
  const filas = cantidadFilas;
  const columnas = cantidadColumnas;

  const [celdas, setCeldas] = useState<Celda[]>(
    Array.from({ length: filas * columnas }, (_, i) => ({
      x: i % columnas,
      y: Math.floor(i / columnas),
    }))
  );

  const [celdaSeleccionada, setCeldaSeleccionada] = useState<number | null>(null);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [forma, setForma] = useState<'cuadrada' | 'redonda'>('cuadrada');

useEffect(() => {
  setCeldas((prevCeldas) => {
    const nuevasCeldas: Celda[] = Array.from(
      { length: cantidadFilas * cantidadColumnas },
      (_, i) => {
        const x = i % cantidadColumnas;
        const y = Math.floor(i / cantidadColumnas);

        // Buscamos si ya había una celda en esa posición
        const celdaAnterior = prevCeldas.find((c) => c.x === x && c.y === y);

        return {
          x,
          y,
          mesa: celdaAnterior?.mesa ?? undefined,
        };
      }
    );
    return nuevasCeldas;
  });
}, [cantidadFilas, cantidadColumnas]);
//UseEFfect para mockear mesas:

useEffect(() => {
const mesasMockeadas: Celda[] = [
  { x: 0, y: 0, mesa: { id: 'm1', numero: '1', tipo: 'cuadrada' } },
  { x: 1, y: 0, mesa: { id: 'm2', numero: '2', tipo: 'redonda' } },
  { x: 2, y: 1, mesa: { id: 'm3', numero: '3', tipo: 'cuadrada' } },
  { x: 3, y: 1, mesa: { id: 'm4', numero: '4', tipo: 'redonda' } },
];


  
  setCeldas((prevCeldas) =>
    prevCeldas.map((celda) => {
      const encontrada = mesasMockeadas.find(
        (m) => m.x === celda.x && m.y === celda.y
      );
      return encontrada ?? celda;
    })
  );
}, []);


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

    setCeldas((prev) =>
      prev.map((celda, i) =>
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
      )
    );

    setCeldaSeleccionada(null);
    setNumeroMesa('');
    setForma('cuadrada');
  };

  //Manejo drag and drop
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const fromIndex = parseInt(active.id.toString());
  const toIndex = parseInt(over.id.toString());

  setCeldas((prev) => {
    const updated = [...prev];

    const mesaOrigen = updated[fromIndex].mesa;
    const mesaDestino = updated[toIndex].mesa;

    // Si no hay mesa en origen o ya hay mesa en destino, no hacemos nada
    if (!mesaOrigen || mesaDestino) return prev;

    updated[fromIndex].mesa = undefined;
    updated[toIndex].mesa = mesaOrigen;

    return updated;
  });
};




function DraggableMesa({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });

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
  style={{ width: 80, height: 80 }}
>

      {children}
    </div>
  );
}


  return (
  <div>
    {modoEdicion && (
      <div className="mb-4 flex gap-4">
        <label className="flex flex-col text-sm">
          Filas
          <input
            type="number"
            min={1}
            max={20}
            value={cantidadFilas}
            onChange={(e) => setCantidadFilas(Number(e.target.value))}
            className="border p-1 rounded w-20"
          />
        </label>
        <label className="flex flex-col text-sm">
          Columnas
          <input
            type="number"
            min={1}
            max={20}
            value={cantidadColumnas}
            onChange={(e) => setCantidadColumnas(Number(e.target.value))}
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
              gridTemplateColumns: `repeat(${columnas}, 80px)`,
              gridTemplateRows: `repeat(${filas}, 80px)`,
            }
          : { height: filas * 80, width: columnas * 80 }
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
                left: `${celda.x * 80}px`,
                top: `${celda.y * 80}px`,
                width: '80px',
                height: '80px',
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
    </div>
  </div>
);

}
export default MesaGrid;