import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Pedido } from '@/lib/types';

export function Mostrador() {
const pedidosMock: Pedido[] = [
  { id: 144053, horaInicio: '26/07/25 09:38:40', estado: 'En curso', cliente: 'enemiga de camilo', total: 3900 },
  { id: 143478, horaInicio: '19/07/25 12:23:37', estado: 'En curso', cliente: 'PRIMO DE OMAR', total: 24500 },
  // Agrega más para pruebas
];


  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosMock);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">MOSTRADOR</h2>
        <Button>+ Nuevo Pedido</Button>
      </div>

      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Hora Inicio</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Cliente</th>
            <th className="p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id} className="hover:bg-gray-50">
              <td className="p-2 border">{pedido.id}</td>
              <td className="p-2 border">{pedido.horaInicio}</td>
              <td className="p-2 border">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{pedido.estado}</span>
              </td>
              <td className="p-2 border">{pedido.cliente}</td>
              <td className="p-2 border">${pedido.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
