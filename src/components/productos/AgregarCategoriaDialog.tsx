import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Categoria } from "@/lib/types";
// import { AgregarProductoForm } from "./AgregarProductoForm";
import { AgregarCategoriaForm } from "./AgregarCategoriaForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (categoria: Categoria) => void;
};

export function AgregarCategoriaDialog({ open, onClose, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar nueva categoría</DialogTitle>
        </DialogHeader>

        <AgregarCategoriaForm
          onCancel={onClose}
          onSave={(categoria) => {
            onSave(categoria);
            onClose(); // Cierra el modal después de guardar
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
