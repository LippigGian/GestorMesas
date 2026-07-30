import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Producto, Categoria } from "@/lib/types";
import { Label } from "@/components/ui/label";

type Props = {
  categorias: Categoria[];
  error?: string | null;
  initialProducto?: Producto;
  onSave: (producto: Producto) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
};

export function AgregarProductoForm({
  categorias,
  error,
  initialProducto,
  onSave,
  onCancel,
  submitLabel = "Guardar",
}: Props) {
  const [nombre, setNombre] = useState(initialProducto?.nombre ?? "");
  const [precio, setPrecio] = useState<number>(initialProducto?.precio ?? 0);
  const [categoriaId, setCategoriaId] = useState<string>(
    initialProducto?.categoriaId || categorias[0]?.id || ""
  );

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          id: initialProducto?.id ?? crypto.randomUUID(),
          nombre,
          precio,
          categoriaId,
        });
      }}
    >
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
