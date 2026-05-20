import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProductosCatalogo } from "@/hooks/useProductosCatalogo";
import { AgregarCategoriaDialog } from "./AgregarCategoriaDialog";
import { AgregarProductoDialog } from "./AgregarProductoDialog";

export function Productos() {
  const {
    agregarCategoria,
    agregarProducto,
    busqueda,
    categorias,
    categoriaSeleccionada,
    productosFiltrados,
    setBusqueda,
    setCategoriaSeleccionada,
  } = useProductosCatalogo();

  const [mostrarDialogo, setMostrarDialogo] = useState(false);
  const [mostrarDialogoCategoria, setMostrarDialogoCategoria] = useState(false);

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
        onSave={agregarCategoria}
      />
      <AgregarProductoDialog
        open={mostrarDialogo}
        onClose={() => setMostrarDialogo(false)}
        categorias={categorias}
        onSave={agregarProducto}
      />
    </main>
  );
}
