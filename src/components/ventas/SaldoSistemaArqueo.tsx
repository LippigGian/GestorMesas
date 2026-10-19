import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocal } from "@/context/LocalContext";
import { usePermisos } from "@/context/PermisosContext";
import { Button } from "@/components/ui/button";
import { obtenerSaldoSistemaArqueo, type SaldoSistemaMedio } from "@/services/arqueosCajaService";

const moneda = (valor: number) => new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS",
}).format(valor);

export type ResultadoSaldoArqueo = { arqueoId: string; localId: string; medios: SaldoSistemaMedio[] };

export function DiferenciaSaldoArqueo({ esperado, declarado }: { esperado?: number; declarado: string }) {
  const { tiene } = usePermisos();
  if (!tiene("ver_saldos_arqueo") || esperado === undefined) return null;
  const texto = declarado.trim().replace(",", ".");
  const valido = /^\d+(?:\.\d{1,2})?$/.test(texto) && Number.isFinite(Number(texto));
  const diferencia = valido ? Math.round((Number(texto) - esperado) * 100) / 100 : null;
  return <div className="space-y-1 text-xs" aria-live="polite" aria-atomic="true">
    <p className="text-muted-foreground">Sistema: <span className="font-medium tabular-nums">{moneda(esperado)}</span></p>
    {diferencia !== null && <p className={`rounded-md border px-2 py-1.5 font-semibold tabular-nums ${diferencia < 0 ? "border-red-200 bg-red-50 text-red-700" : diferencia > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted/40 text-muted-foreground"}`}>
      {diferencia < 0 ? `Faltante: ${moneda(Math.abs(diferencia))}` : diferencia > 0 ? `Excedente: ${moneda(diferencia)}` : "El importe coincide con el sistema"}
    </p>}
  </div>;
}

export function SaldoSistemaArqueo({ arqueoId, revision = 0, onResultadoChange }: {
  arqueoId: string;
  revision?: number;
  onResultadoChange?: (resultado: ResultadoSaldoArqueo | null) => void;
}) {
  const { localId } = useLocal();
  const { tiene } = usePermisos();
  const puedeVer = tiene("ver_saldos_arqueo");
  const [actualizacion, setActualizacion] = useState(0);
  const [resultado, setResultado] = useState<ResultadoSaldoArqueo | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    setResultado(null);
    onResultadoChange?.(null);
    setError("");
    if (!puedeVer || !localId) return;
    const localActual = localId;
    setCargando(true);
    obtenerSaldoSistemaArqueo(arqueoId).then((medios) => {
      if (vigente) {
        const nuevoResultado = { arqueoId, localId: localActual, medios };
        setResultado(nuevoResultado);
        onResultadoChange?.(nuevoResultado);
      }
    }).catch((err) => {
      if (vigente) setError(err instanceof Error ? err.message : "No se pudo consultar el saldo.");
    }).finally(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; };
  }, [arqueoId, localId, puedeVer, revision, actualizacion, onResultadoChange]);

  if (!puedeVer || !localId) return null;
  const medios = resultado?.arqueoId === arqueoId && resultado.localId === localId ? resultado.medios : null;
  return (
    <section aria-label="Saldo esperado según el sistema" className="rounded-xl border bg-secondary/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Esperado según el sistema</h3>
        <Button type="button" variant="ghost" size="icon" aria-label="Actualizar saldo esperado" disabled={cargando} onClick={() => setActualizacion((n) => n + 1)}>
          <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </Button>
      </div>
      {cargando ? <p role="status" className="text-sm text-muted-foreground">Consultando saldo…</p> : error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : medios && (
        <>
          <dl className="mt-2 space-y-2 text-sm">
            {medios.map((medio) => (
              <div key={medio.medioPagoId} className="flex justify-between gap-3">
                <dt className="min-w-0 break-words text-muted-foreground">{medio.nombre}</dt>
                <dd className="shrink-0 font-medium tabular-nums">{moneda(medio.monto)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t pt-3 font-semibold">
              <dt>Total esperado</dt>
              <dd className="tabular-nums">{moneda(medios.reduce((total, medio) => total + medio.monto, 0))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Cobros menos gastos del arqueo. No incluye el fondo inicial, siguiendo el cálculo utilizado al cerrar caja.</p>
        </>
      )}
    </section>
  );
}
