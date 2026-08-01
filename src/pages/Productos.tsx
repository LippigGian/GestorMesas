import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProductosCatalogo } from "@/hooks/useProductosCatalogo";
import { AgregarCategoriaDialog } from "@/components/productos/AgregarCategoriaDialog";
import { AgregarProductoDialog } from "@/components/productos/AgregarProductoDialog";
import { Edit, Star, Trash2 } from "lucide-react";
import type { Producto } from "@/lib/types";
import { EditarProductoDialog } from "@/components/productos/EditarProductoDialog";

export function Productos() {
  const {
    agregarCategoria,
    agregarProducto,
    alternarFavoritoProducto,
    borrarProducto,
    borrarCategoriaSeleccionada,
    busqueda,
    cargando,
    categorias,
    categoriaActual,
    categoriaSeleccionada,
    editarProducto,
    error,
    guardando,
    productosEnCategoriaSeleccionada,
    productosFiltrados,
    setBusqueda,
    setCategoriaSeleccionada,
  } = useProductosCatalogo();

  const [mostrarDialogo, setMostrarDialogo] = useState(false);
  const [mostrarDialogoCategoria, setMostrarDialogoCategoria] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);

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

        {categoriaActual && (
          <div className="mt-4 rounded-md border bg-background p-3">
            <div className="mb-2 text-sm font-medium text-foreground">{categoriaActual.nombre}</div>
            <div className="mb-3 text-xs text-muted-foreground">
              {productosEnCategoriaSeleccionada.length} productos
            </div>
            <Button
              className="w-full"
              disabled={guardando || productosEnCategoriaSeleccionada.length > 0}
              size="sm"
              type="button"
              variant="destructive"
              title={
                productosEnCategoriaSeleccionada.length > 0
                  ? "Primero elimina o mueve los productos de esta categoria"
                  : "Eliminar categoria"
              }
              onClick={() => {
                if (window.confirm(`Eliminar la categoria "${categoriaActual.nombre}"?`)) {
                  borrarCategoriaSeleccionada();
                }
              }}
            >
              <Trash2 />
              Eliminar
            </Button>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Button
            className="w-full"
            disabled={guardando}
            onClick={() => setMostrarDialogoCategoria(true)}
          >
            Agregar categoria
          </Button>
          <Button
            className="w-full"
            disabled={guardando || categorias.length === 0}
            variant="secondary"
            onClick={() => setMostrarDialogo(true)}
          >
            Agregar producto
          </Button>
        </div>
      </aside>

      <section className="flex-1 p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Productos</h1>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

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
              <th className="w-16 p-2 text-center">Fav.</th>
              <th className="p-2 text-right">Precio</th>
              <th className="w-28 p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                  Cargando productos...
                </td>
              </tr>
            ) : productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => (
                <tr key={producto.id} className="border-b transition hover:bg-muted/60">
                  <td className="p-2">{producto.nombre}</td>
                  <td className="p-2 text-center">
                    <Button
                      className={
                        producto.favorito
                          ? "text-yellow-600 hover:text-yellow-700"
                          : "text-muted-foreground"
                      }
                      disabled={guardando}
                      size="icon"
                      type="button"
                      variant="ghost"
                      title={producto.favorito ? "Quitar de favoritos" : "Marcar como favorito"}
                      onClick={() => alternarFavoritoProducto(producto)}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={producto.favorito ? "currentColor" : "none"}
                      />
                    </Button>
                  </td>
                  <td className="p-2 text-right">${producto.precio.toLocaleString()}</td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        disabled={guardando}
                        size="icon"
                        type="button"
                        variant="ghost"
                        title="Editar producto"
                        onClick={() => setProductoEditando(producto)}
                      >
                        <Edit />
                      </Button>
                      <Button
                        disabled={guardando}
                        size="icon"
                        type="button"
                        variant="ghost"
                        title="Eliminar producto"
                        onClick={() => {
                          if (window.confirm(`Eliminar el producto "${producto.nombre}"?`)) {
                            borrarProducto(producto);
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                  No hay productos para mostrar.
                </td>
              </tr>
            )}
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
      <EditarProductoDialog
        categorias={categorias}
        onClose={() => setProductoEditando(null)}
        onSave={editarProducto}
        producto={productoEditando}
      />
    </main>
  );
}
