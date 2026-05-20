import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Categoria, Producto } from "@/lib/types";
import { AgregarCategoriaDialog } from "./AgregarCategoriaDialog";
import { AgregarProductoDialog } from "./AgregarProductoDialog";

const categoriasMock: Categoria[] = [
  { id: "1", nombre: "Bebidas" },
  { id: "2", nombre: "Cafeteria" },
];

const productosMock: Producto[] = [
  { id: "a1", nombre: "Agua con gas", precio: 1900, categoriaId: "1" },
  { id: "a2", nombre: "Pepsi", precio: 1900, categoriaId: "1" },
  { id: "b1", nombre: "Cafe espresso", precio: 2200, categoriaId: "2" },
];

export function Productos() {
  const [categorias] = useState<Categoria[]>(categoriasMock);
  const [productos] = useState<Producto[]>(productosMock);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("1");
  const [busqueda, setBusqueda] = useState<string>("");
  const [mostrarDialogo, setMostrarDialogo] = useState(false);
  const [mostrarDialogoCategoria, setMostrarDialogoCategoria] = useState(false);

  const productosFiltrados = productos.filter(
    (producto) =>
      producto.categoriaId === categoriaSeleccionada &&
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="flex min-h-[calc(100vh-128px)]">
      <aside className="w-60 border-r bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-bold text-foreground">Categorias</h2>
        <ul className="space-y-1">
          {categorias.map((categoria) => (
            <li
              key={categoria.id}
              className={`cursor-pointer rounded-md p-2 text-sm font-medium transition ${
                categoria.id === categoriaSeleccionada
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
              onClick={() => setCategoriaSeleccionada(categoria.id)}
            >
              {categoria.nombre}
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2">
          <Button className="w-full" onClick={() => setMostrarDialogoCategoria(true)}>
            Agregar categoria
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => setMostrarDialogo(true)}>
            Agregar producto
          </Button>
        </div>
      </aside>

      <section className="flex-1 p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Productos</h1>

        <input
          type="text"
          placeholder="Filtrar por producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="mb-4 w-full rounded-md border bg-card p-2 text-foreground placeholder:text-muted-foreground"
        />

        <table className="w-full overflow-hidden rounded-lg border bg-card shadow-sm">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="p-2 text-left">Producto</th>
              <th className="p-2 text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((producto) => (
              <tr key={producto.id} className="border-b transition hover:bg-muted/60">
                <td className="p-2">{producto.nombre}</td>
                <td className="p-2 text-right">${producto.precio.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <AgregarCategoriaDialog
        open={mostrarDialogoCategoria}
        onClose={() => setMostrarDialogoCategoria(false)}
        onSave={(categoria) => {
          console.log("Categoria guardada:", categoria);
        }}
      />
      <AgregarProductoDialog
        open={mostrarDialogo}
        onClose={() => setMostrarDialogo(false)}
        categorias={categorias}
        onSave={(producto) => {
          console.log("Producto guardado:", producto);
        }}
      />
    </main>
  );
}
