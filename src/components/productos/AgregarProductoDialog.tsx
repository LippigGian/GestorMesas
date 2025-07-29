import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Producto } from "@/lib/types";
// import { ProductoForm } from "./ProductoForm";
import { AgregarProductoForm } from "./AgregarProductoForm";    
type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (producto: Producto) => void;
};

export function AgregarProductoDialog({ open, onClose, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar nuevo producto</DialogTitle>
        </DialogHeader>

        <AgregarProductoForm
          onCancel={onClose}
          onSave={(producto) => {
            onSave(producto);
            onClose(); // Cierra el modal después de guardar
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
