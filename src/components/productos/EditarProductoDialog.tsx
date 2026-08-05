import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Categoria, Producto } from "@/lib/types";
import { AgregarProductoForm } from "./AgregarProductoForm";

type Props = {
  categorias: Categoria[];
  onClose: () => void;
  onSave: (producto: Producto) => Promise<void> | void;
  producto: Producto | null;
};

export function EditarProductoDialog({ categorias, onClose, onSave, producto }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={Boolean(producto)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
        </DialogHeader>

        {producto && (
          <AgregarProductoForm
            categorias={categorias}
            error={error}
            initialProducto={producto}
            onCancel={() => {
              setError(null);
              onClose();
            }}
            onSave={async (productoEditado) => {
              try {
                setError(null);
                await onSave(productoEditado);
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo guardar el producto");
              }
            }}
            submitLabel="Guardar cambios"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
