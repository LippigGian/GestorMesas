import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Categoria, Producto } from "@/lib/types";
import { AgregarProductoForm } from "./AgregarProductoForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (producto: Producto) => Promise<void> | void;
  categorias: Categoria[];
};

export function AgregarProductoDialog({ open, onClose, onSave, categorias }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar nuevo producto</DialogTitle>
        </DialogHeader>

        <AgregarProductoForm
          categorias={categorias}
          error={error}
          onCancel={() => {
            setError(null);
            onClose();
          }}
          onSave={async (producto) => {
            try {
              setError(null);
              await onSave(producto);
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo guardar el producto");
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
