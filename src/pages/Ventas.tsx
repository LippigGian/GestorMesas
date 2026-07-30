import { CalendarDays, Filter, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Ventas() {
  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            Historial y analisis de pedidos finalizados.
          </p>
        </div>
      </div>

      <section className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-sm font-medium text-foreground">
            Desde
            <Input className="mt-1" type="date" />
          </label>
          <label className="text-sm font-medium text-foreground">
            Hasta
            <Input className="mt-1" type="date" />
          </label>
          <label className="text-sm font-medium text-foreground">
            Buscar
            <Input className="mt-1" placeholder="Mesa, cliente o pedido..." />
          </label>
          <div className="flex items-end">
            <Button className="w-full" type="button" variant="secondary">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ReceiptText className="h-4 w-4" />
            Ventas
          </div>
          <p className="text-2xl font-bold text-foreground">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Total vendido
          </div>
          <p className="text-2xl font-bold text-foreground">$0</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ReceiptText className="h-4 w-4" />
            Ticket promedio
          </div>
          <p className="text-2xl font-bold text-foreground">$0</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Mesa / Cliente</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                Todavia no hay ventas para mostrar.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
