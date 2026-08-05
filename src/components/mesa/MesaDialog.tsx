"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  numeroMesa: string;
  setNumeroMesa: (valor: string) => void;
  forma: "cuadrada" | "redonda";
  setForma: (valor: "cuadrada" | "redonda") => void;
  onConfirmar: () => void;
  modoEdicion: boolean;
};

export function MesaDialog({
  open,
  onClose,
  numeroMesa,
  setNumeroMesa,
  forma,
  setForma,
  onConfirmar,
  modoEdicion,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {modoEdicion ? "Modificar mesa" : "Agregar mesa"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Número de mesa</label>
            <Input
              type="text"
              value={numeroMesa}
              onChange={(e) => setNumeroMesa(e.target.value)}
              placeholder="Ej: 1, 2, A1"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Forma</label>
            <div className="flex gap-2">
              <Button
                variant={forma === "cuadrada" ? "default" : "outline"}
                onClick={() => setForma("cuadrada")}
              >
                Cuadrada
              </Button>
              <Button
                variant={forma === "redonda" ? "default" : "outline"}
                onClick={() => setForma("redonda")}
              >
                Redonda
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2 gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onConfirmar}>
              {modoEdicion ? "Guardar cambios" : "Agregar mesa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MesaDialog;
