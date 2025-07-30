import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Producto, Categoria } from "@/lib/types";
import { AgregarProductoForm } from "./AgregarProductoForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (producto: Producto) => void;
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
          onSave={(producto) => {
            onSave(producto);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
