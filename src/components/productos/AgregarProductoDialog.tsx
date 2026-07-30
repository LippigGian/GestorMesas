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
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar nuevo producto</DialogTitle>
        </DialogHeader>

        <AgregarProductoForm
          categorias={categorias}
          onCancel={onClose}
          onSave={async (producto) => {
            await onSave(producto);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
