import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Pedido } from '@/lib/types';

export function Mostrador() {
const pedidosMock: Pedido[] = [
  { id: 144053, horaInicio: '26/07/25 09:38:40', estado: 'En curso', cliente: 'enemiga de camilo', total: 3900 },
  { id: 143478, horaInicio: '19/07/25 12:23:37', estado: 'En curso', cliente: 'PRIMO DE OMAR', total: 24500 },
  // Agrega más para pruebas
];


  const [pedidos] = useState<Pedido[]>(pedidosMock);

  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Mostrador</h2>
        <Button>+ Nuevo Pedido</Button>
      </div>

      <table className="w-full overflow-hidden rounded-lg border bg-card text-sm shadow-sm">
        <thead className="bg-secondary text-secondary-foreground">
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
            <tr key={pedido.id} className="hover:bg-muted/60">
              <td className="p-2 border">{pedido.id}</td>
              <td className="p-2 border">{pedido.horaInicio}</td>
              <td className="p-2 border">
                <span className="rounded bg-accent/30 px-2 py-1 text-xs font-medium text-primary">{pedido.estado}</span>
              </td>
              <td className="p-2 border">{pedido.cliente}</td>
              <td className="p-2 border">${pedido.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
