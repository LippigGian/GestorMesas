import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Categoria } from "@/lib/types";
import { AgregarCategoriaForm } from "./AgregarCategoriaForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (categoria: Categoria) => Promise<void> | void;
};

export function AgregarCategoriaDialog({ open, onClose, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar nueva categoria</DialogTitle>
        </DialogHeader>

        <AgregarCategoriaForm
          onCancel={onClose}
          onSave={async (categoria) => {
            await onSave(categoria);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
