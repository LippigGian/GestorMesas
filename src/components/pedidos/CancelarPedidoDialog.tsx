import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CancelarPedidoDialog({ open, onOpenChange, onConfirmar }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: () => Promise<void>;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  return <Dialog open={open} onOpenChange={(value) => { if (!guardando) { setError(""); onOpenChange(value); } }}>
    <DialogContent showCloseButton={!guardando}>
      <DialogHeader>
        <DialogTitle>¿Eliminar este pedido?</DialogTitle>
        <DialogDescription>Quedará guardado en el historial como Cancelada. Si pertenece a una mesa, esta se liberará.</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">Los productos e importes confirmados se conservarán. Los cobros registrados no se borran ni se reembolsan automáticamente. Las adiciones sin confirmar se descartarán.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button disabled={guardando} variant="outline" onClick={() => { setError(""); onOpenChange(false); }}>Volver</Button>
        <Button disabled={guardando} variant="destructive" onClick={async () => {
          if (guardando) return;
          setError(""); setGuardando(true);
          try { await onConfirmar(); onOpenChange(false); }
          catch (err) { setError(err instanceof Error ? err.message : "No se pudo cancelar el pedido."); }
          finally { setGuardando(false); }
        }}>{guardando ? "Cancelando…" : "Eliminar pedido"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
