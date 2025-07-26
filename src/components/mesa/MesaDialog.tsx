import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  numeroMesa: string;
  forma: 'cuadrada' | 'redonda';
  setNumeroMesa: (val: string) => void;
  setForma: (val: 'cuadrada' | 'redonda') => void;
  onConfirmar: () => void;
};

export function MesaDialog({
  open,
  onClose,
  numeroMesa,
  forma,
  setNumeroMesa,
  setForma,
  onConfirmar,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Mesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Número de mesa"
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value)}
          />
          <div className="flex gap-4">
            <Button
              variant={forma === 'cuadrada' ? 'default' : 'outline'}
              onClick={() => setForma('cuadrada')}
            >
              Cuadrada
            </Button>
            <Button
              variant={forma === 'redonda' ? 'default' : 'outline'}
              onClick={() => setForma('redonda')}
            >
              Redonda
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
