import type { Producto, Categoria } from "@/lib/types";

import { useState } from "react";
import { AgregarProductoDialog } from "./AgregarProductoDialog";
import { AgregarCategoriaDialog } from "./AgregarCategoriaDialog";

import { Button } from "@/components/ui/button";

const categoriasMock: Categoria[] = [
  { id: "1", nombre: "Bebidas" },
  { id: "2", nombre: "Cafetería" },
];

const productosMock: Producto[] = [
  { id: "a1", nombre: "Agua con gas", precio: 1900, categoriaId: "1" },
  { id: "a2", nombre: "Pepsi", precio: 1900, categoriaId: "1" },
  { id: "b1", nombre: "Café espresso", precio: 2200, categoriaId: "2" },
];


export function Productos() {
  // const [categorias] = useState<Categoria[]>(categoriasMock);
   const [categorias, setCategorias] = useState<Categoria[]>(categoriasMock);
  const [productos] = useState<Producto[]>(productosMock);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string>("1");
  const [busqueda, setBusqueda] = useState<string>("");

  const [mostrarDialogo, setMostrarDialogo] = useState(false);
  const [mostrarDialogoCategoria, setMostrarDialogoCategoria] = useState(false);
  

  const productosFiltrados = productos.filter(
    (p) =>
      p.categoriaId === categoriaSeleccionada &&
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      {/* Sidebar de categorías */}
      <div className="w-56 bg-gray-100 p-4 border-r">
        <h2 className="font-bold mb-2">Categorías</h2>
        <ul className="space-y-1">
          {categorias.map((cat) => (
            <li
              key={cat.id}
              className={`cursor-pointer p-2 rounded ${
                cat.id === categoriaSeleccionada
                  ? "bg-gray-300"
                  : "hover:bg-gray-200"
              }`}
              onClick={() => setCategoriaSeleccionada(cat.id)}
            >
              {cat.nombre}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
<Button onClick={() => setMostrarDialogoCategoria(true)}>Agregar categoría</Button>
          <Button onClick={() => setMostrarDialogo(true)}>
            Agregar producto
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Productos</h1>

        <input
          type="text"
          placeholder="Filtrar por producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="text-left p-2">Producto</th>
              <th className="text-right p-2">Precio</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((producto) => (
              <tr key={producto.id} className="border-b">
                <td className="p-2">{producto.nombre}</td>
                <td className="p-2 text-right">
                  ${producto.precio.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
          <AgregarCategoriaDialog
  open={mostrarDialogoCategoria}
  onClose={() => setMostrarDialogoCategoria(false)}
  onSave={(categoria) => {
    console.log("Categoría guardada:", categoria);
    // Aquí podrías agregarla a tu lista local o guardarla en Firebase
  }}
/>
<AgregarProductoDialog
  open={mostrarDialogo}
  onClose={() => setMostrarDialogo(false)}
  categorias={categorias} // ✅ Así se pasa correctamente
  onSave={(producto) => {
    console.log("Producto guardado:", producto);
    // Aquí podrías agregarlo a tu lista local o guardarlo en Firebase
  }}
/>

    </div>  
  );
}
