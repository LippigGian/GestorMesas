import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Producto } from "@/lib/types";

type Props = {
  onSave: (producto: Producto) => void;
  onCancel: () => void;
};

export function AgregarProductoForm({ onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState(0);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: crypto.randomUUID(),
          nombre,
          precio,
          categoriaId: "", // completar después con lógica de selección
        });
      }}
    >
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium">Precio</label>
        <Input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(Number(e.target.value))}
          required
        />
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
