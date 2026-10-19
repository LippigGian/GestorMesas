import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EstadoSincronizacion({ conectado, error, actualizar }: {
  conectado: boolean; error: string; actualizar: () => void;
}) {
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
    <span role="status">{error || (conectado ? "Actualización en vivo" : "Conectando actualización en vivo · respaldo cada 30 s")}</span>
    <Button type="button" size="sm" variant="ghost" onClick={actualizar} aria-label="Actualizar mesas y pedidos">
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Actualizar
    </Button>
  </div>;
}
