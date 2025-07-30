import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Producto, Categoria } from "@/lib/types";
import { Label } from "@/components/ui/label";

type Props = {
  categorias: Categoria[];
  onSave: (producto: Producto) => void;
  onCancel: () => void;
};

export function AgregarProductoForm({ categorias, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<number>(0);
  const [categoriaId, setCategoriaId] = useState<string>(categorias[0]?.id || "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: crypto.randomUUID(),
          nombre,
          precio,
          categoriaId,
        });
      }}
    >
      <div>
        <Label>Nombre del producto</Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Precio</Label>
        <Input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(Number(e.target.value))}
          required
        />
      </div>

      <div>
        <Label>Categoría</Label>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="w-full border rounded px-2 py-1"
          required
        >
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}
