import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Categoria } from "@/lib/types";

type Props = {
  onSave: (categoria: Categoria) => void;
  onCancel: () => void;
};

export function AgregarCategoriaForm({ onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: crypto.randomUUID(),
          nombre,
        });
      }}
    >
      <div>
        <label className="block text-sm font-medium">Nombre de la categoría</label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
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
