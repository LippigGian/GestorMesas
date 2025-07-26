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


import { useState } from 'react';
import { MesaCard } from './MesaCard';
import { MesaDialog } from './MesaDialog';
import type { Celda, Mesa } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  modoEdicion: boolean;
};

export function MesaGrid({ modoEdicion }: Props) {
  const filas = 5;
  const columnas = 6;

  const [celdas, setCeldas] = useState<Celda[]>(
    Array.from({ length: filas * columnas }, (_, i) => ({
      x: i % columnas,
      y: Math.floor(i / columnas),
    }))
  );

  const [celdaSeleccionada, setCeldaSeleccionada] = useState<number | null>(null);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [forma, setForma] = useState<'cuadrada' | 'redonda'>('cuadrada');

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

  return (
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
      {celdas.map((celda, i) =>
        modoEdicion ? (
          <div
            key={`${celda.x}-${celda.y}`}
            className="border border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
            onClick={() => handleAbrirDialogo(i)}
          >
            {celda.mesa ? (
              <MesaCard numero={celda.mesa.numero} tipo={celda.mesa.tipo} />
            ) : (
              <span className="text-gray-400">+</span>
            )}
          </div>
        ) : celda.mesa ? (
          <div
            key={`${celda.x}-${celda.y}`}
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
  );
}
export default MesaGrid;