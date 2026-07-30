import { useEffect, useState } from "react";
import { ArrowLeft, Filter, Plus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ArqueoCaja, Caja } from "@/lib/types";
import {
  cerrarArqueoCaja,
  crearArqueoCaja,
  obtenerArqueosCaja,
} from "@/services/arqueosCajaService";
import { obtenerCajas } from "@/services/cajasService";

type VentasTab = "ventas" | "movimientos" | "arqueos" | "descuentos";

function formatearFecha(value?: string) {
  if (!value) return "-";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;

  return fecha.toLocaleString();
}

function formatearMoneda(value: number) {
  return `$${value.toLocaleString()}`;
}

export function Ventas() {
  const [tabActiva, setTabActiva] = useState<VentasTab>("ventas");
  const [arqueos, setArqueos] = useState<ArqueoCaja[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<ArqueoCaja | null>(null);
  const [cajaId, setCajaId] = useState("");
  const [montoInicial, setMontoInicial] = useState("0");
  const [montoCierre, setMontoCierre] = useState("");
  const [cargandoArqueos, setCargandoArqueos] = useState(false);
  const [guardandoArqueo, setGuardandoArqueo] = useState(false);
  const [errorArqueos, setErrorArqueos] = useState<string | null>(null);
  const arqueoAbierto = arqueos.find((arqueo) => arqueo.estado === "abierto") ?? null;
  const cajasActivas = cajas.filter((caja) => caja.activo);
  const saldoActual = arqueos.reduce(
    (acc, arqueo) => acc + (arqueo.estado === "abierto" ? arqueo.montoInicial + arqueo.totalVentas : 0),
    0
  );
  const totalVentas = arqueos.reduce((acc, arqueo) => acc + arqueo.totalVentas, 0);

  useEffect(() => {
    let mounted = true;

    async function cargarDatos() {
      try {
        setCargandoArqueos(true);
        setErrorArqueos(null);
        const [arqueosDb, cajasDb] = await Promise.all([obtenerArqueosCaja(), obtenerCajas()]);

        if (mounted) {
          setArqueos(arqueosDb);
          setCajas(cajasDb);
          setCajaId(cajasDb.find((caja) => caja.activo)?.id ?? "");
        }
      } catch (err) {
        if (mounted) {
          setErrorArqueos(err instanceof Error ? err.message : "No se pudieron cargar los datos");
        }
      } finally {
        if (mounted) {
          setCargandoArqueos(false);
        }
      }
    }

    cargarDatos();

    return () => {
      mounted = false;
    };
  }, []);

  const abrirArqueo = async () => {
    const monto = Number(montoInicial);

    if (!Number.isFinite(monto) || monto < 0) {
      setErrorArqueos("El monto inicial debe ser mayor o igual a cero.");
      return;
    }

    try {
      setGuardandoArqueo(true);
      setErrorArqueos(null);
      const creado = await crearArqueoCaja({ cajaId, montoInicial: monto });
      setArqueos((prev) => [creado, ...prev]);
      setArqueoSeleccionado(creado);
      setMontoInicial("0");
    } catch (err) {
      setErrorArqueos(err instanceof Error ? err.message : "No se pudo abrir el arqueo");
    } finally {
      setGuardandoArqueo(false);
    }
  };

  const cerrarArqueo = async () => {
    if (!arqueoAbierto) return;

    const monto = Number(montoCierre);
    if (!Number.isFinite(monto) || monto < 0) {
      setErrorArqueos("El monto declarado debe ser mayor o igual a cero.");
      return;
    }

    try {
      setGuardandoArqueo(true);
      setErrorArqueos(null);
      const cerrado = await cerrarArqueoCaja({
        arqueoId: arqueoAbierto.id,
        montoFinalDeclarado: monto,
      });
      setArqueos((prev) => prev.map((arqueo) => (arqueo.id === cerrado.id ? cerrado : arqueo)));
      setArqueoSeleccionado(cerrado);
      setMontoCierre("");
    } catch (err) {
      setErrorArqueos(err instanceof Error ? err.message : "No se pudo cerrar el arqueo");
    } finally {
      setGuardandoArqueo(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-128px)] bg-background">
      <div className="flex items-center gap-2 border-b bg-primary px-4 py-2 text-primary-foreground">
        <Button
          variant={tabActiva === "ventas" ? "secondary" : "ghost"}
          className="text-primary-foreground data-[active=true]:text-secondary-foreground"
          data-active={tabActiva === "ventas"}
          onClick={() => setTabActiva("ventas")}
        >
          Ventas
        </Button>
        {/* <Button
          variant={tabActiva === "movimientos" ? "secondary" : "ghost"}
          className="text-primary-foreground data-[active=true]:text-secondary-foreground"
          data-active={tabActiva === "movimientos"}
          onClick={() => setTabActiva("movimientos")}
        >
          Movimientos de caja
        </Button> */}
        <Button
          variant={tabActiva === "arqueos" ? "secondary" : "ghost"}
          className="text-primary-foreground data-[active=true]:text-secondary-foreground"
          data-active={tabActiva === "arqueos"}
          onClick={() => setTabActiva("arqueos")}
        >
          Arqueos de Caja
        </Button>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            arqueoAbierto ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
          }`}
        >
          {arqueoAbierto ? "Abierto" : "Cerrado"}
        </span>
        {/* <Button
          variant={tabActiva === "descuentos" ? "secondary" : "ghost"}
          className="text-primary-foreground data-[active=true]:text-secondary-foreground"
          data-active={tabActiva === "descuentos"}
          onClick={() => setTabActiva("descuentos")}
        >
          Descuentos
        </Button> */}
      </div>

      {tabActiva === "arqueos" ? (
        <ArqueosCajaView
          arqueoAbierto={arqueoAbierto}
          arqueoSeleccionado={arqueoSeleccionado}
          arqueos={arqueos}
          cajaId={cajaId}
          cajasActivas={cajasActivas}
          cargando={cargandoArqueos}
          error={errorArqueos}
          guardando={guardandoArqueo}
          montoCierre={montoCierre}
          montoInicial={montoInicial}
          saldoActual={saldoActual}
          totalVentas={totalVentas}
          onAbrirArqueo={abrirArqueo}
          onCerrarArqueo={cerrarArqueo}
          onSelectArqueo={setArqueoSeleccionado}
          setCajaId={setCajaId}
          setMontoCierre={setMontoCierre}
          setMontoInicial={setMontoInicial}
        />
      ) : tabActiva === "ventas" ? (
        <VentasView />
      ) : (
        <PlaceholderModulo titulo={tabActiva === "movimientos" ? "Movimientos de caja" : "Descuentos"} />
      )}
    </main>
  );
}

function VentasView() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_420px]">
      <section className="border-r p-4">
        <div className="mb-4 flex items-center justify-between bg-primary/80 px-4 py-3 text-primary-foreground">
          <h1 className="text-xl font-bold">Ventas</h1>
          {/* <Button type="button" variant="secondary">
            Cerrar caja
          </Button> */}
        </div>

        <section className="mb-4 rounded-md border bg-card">
          <div className="grid gap-3 border-b bg-muted p-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
            <select className="h-10 rounded-md border bg-background px-3">
              <option>Hora Inicio</option>
              <option>Hora cierre</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3">
              <option>Turno</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3">
              <option>Diario</option>
            </select>
            <Input type="date" />
          </div>
          <div className="grid gap-3 bg-muted/70 p-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
            <select className="h-10 rounded-md border bg-background px-3">
              <option>Estado de Venta</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3">
              <option>Tipo de Venta</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3">
              <option>Medio de pago</option>
            </select>
            <Button type="button" variant="secondary">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
          <div className="grid gap-4 border-t p-4 md:grid-cols-5">
            <ResumenDato label="Ventas" value="0" />
            <ResumenDato label="Promedio por venta" value="$0" />
            <ResumenDato label="Personas" value="0" />
            <ResumenDato label="Promedio por persona" value="$0" />
            <ResumenDato label="Total" value="$0" />
          </div>
        </section>

        <section className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-3 text-left">Hora Inicio</th>
                <th className="p-3 text-left">Hora cierre</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Mesa</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                  Todavia no hay ventas para mostrar.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>

      <DetalleVacio />
    </div>
  );
}

type ArqueosCajaViewProps = {
  arqueoAbierto: ArqueoCaja | null;
  arqueoSeleccionado: ArqueoCaja | null;
  arqueos: ArqueoCaja[];
  cajaId: string;
  cajasActivas: Caja[];
  cargando: boolean;
  error: string | null;
  guardando: boolean;
  montoCierre: string;
  montoInicial: string;
  saldoActual: number;
  totalVentas: number;
  onAbrirArqueo: () => void;
  onCerrarArqueo: () => void;
  onSelectArqueo: (arqueo: ArqueoCaja) => void;
  setCajaId: (value: string) => void;
  setMontoCierre: (value: string) => void;
  setMontoInicial: (value: string) => void;
};

function ArqueosCajaView({
  arqueoAbierto,
  arqueoSeleccionado,
  arqueos,
  cajaId,
  cajasActivas,
  cargando,
  error,
  guardando,
  montoCierre,
  montoInicial,
  saldoActual,
  totalVentas,
  onAbrirArqueo,
  onCerrarArqueo,
  onSelectArqueo,
  setCajaId,
  setMontoCierre,
  setMontoInicial,
}: ArqueosCajaViewProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_420px]">
      <section className="border-r p-4">
        <div className="mb-4 flex items-center justify-between bg-primary/80 px-4 py-3 text-primary-foreground">
          <h1 className="text-xl font-bold">Arqueos de Caja</h1>
          <Button disabled={guardando || cajasActivas.length === 0} type="button" variant="secondary" onClick={onAbrirArqueo}>
            <Plus className="h-4 w-4" />
            Nuevo arqueo de caja
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mb-4 grid gap-3 rounded-md border bg-muted p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={cajaId}
            onChange={(event) => setCajaId(event.target.value)}
          >
            <option value="">Caja</option>
            {cajasActivas.map((caja) => (
              <option key={caja.id} value={caja.id}>
                {caja.nombre}
              </option>
            ))}
          </select>
          <Input
            min={0}
            step={0.01}
            type="number"
            value={montoInicial}
            onChange={(event) => setMontoInicial(event.target.value)}
          />
          <select className="h-10 rounded-md border bg-background px-3">
            <option>Estado</option>
            <option>Abierto</option>
            <option>Cerrado</option>
          </select>
          {arqueoAbierto && (
            <div className="flex gap-2">
              <Input
                min={0}
                placeholder="Monto cierre"
                step={0.01}
                type="number"
                value={montoCierre}
                onChange={(event) => setMontoCierre(event.target.value)}
              />
              <Button disabled={guardando} type="button" onClick={onCerrarArqueo}>
                Cerrar caja
              </Button>
            </div>
          )}
        </div>

        <section className="mb-6 grid gap-4 rounded-md border bg-card p-4 md:grid-cols-5">
          <ResumenDato label="Arqueo de Caja" value={`${arqueos.length} caja`} />
          <ResumenDato label="Saldo actual" value={formatearMoneda(saldoActual)} />
          <ResumenDato label="Total de ventas" value={formatearMoneda(totalVentas)} />
          <ResumenDato label="Ingresos" value="$0" />
          <ResumenDato label="Egresos" value="$0" />
        </section>

        <section className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-3 text-left">Apertura / Cierre</th>
                <th className="p-3 text-right">$ Sistema</th>
                <th className="p-3 text-right">$ Usuario</th>
                <th className="p-3 text-right">Diferencia</th>
                <th className="p-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                    Cargando arqueos...
                  </td>
                </tr>
              ) : arqueos.length > 0 ? (
                arqueos.map((arqueo) => (
                  <tr
                    key={arqueo.id}
                    className={`cursor-pointer border-b transition hover:bg-muted/50 ${
                      arqueoSeleccionado?.id === arqueo.id ? "bg-accent/20" : ""
                    }`}
                    onClick={() => onSelectArqueo(arqueo)}
                  >
                    <td className="p-3">
                      <div className="font-semibold">{formatearFecha(arqueo.openedAt)}</div>
                      <div className="text-muted-foreground">{formatearFecha(arqueo.closedAt)}</div>
                    </td>
                    <td className="p-3 text-right">{formatearMoneda(arqueo.totalVentas)}</td>
                    <td className="p-3 text-right">
                      {arqueo.montoFinalDeclarado === undefined
                        ? "-"
                        : formatearMoneda(arqueo.montoFinalDeclarado)}
                    </td>
                    <td className="p-3 text-right">
                      {arqueo.diferencia === undefined ? "-" : formatearMoneda(arqueo.diferencia)}
                    </td>
                    <td className="p-3">{arqueo.estado}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                    No hay arqueos cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>

      {arqueoSeleccionado ? (
        <aside className="p-6">
          <h2 className="mb-4 text-xl font-bold">Detalle de arqueo</h2>
          <div className="space-y-3 rounded-md border bg-card p-4 text-sm shadow-sm">
            <DetalleDato label="Caja" value={arqueoSeleccionado.cajaNombre ?? "-"} />
            <DetalleDato label="Estado" value={arqueoSeleccionado.estado} />
            <DetalleDato label="Apertura" value={formatearFecha(arqueoSeleccionado.openedAt)} />
            <DetalleDato label="Cierre" value={formatearFecha(arqueoSeleccionado.closedAt)} />
            <DetalleDato label="Monto inicial" value={formatearMoneda(arqueoSeleccionado.montoInicial)} />
            <DetalleDato label="Total ventas" value={formatearMoneda(arqueoSeleccionado.totalVentas)} />
          </div>
        </aside>
      ) : (
        <DetalleVacio />
      )}
    </div>
  );
}

function PlaceholderModulo({ titulo }: { titulo: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_420px]">
      <section className="border-r p-4">
        <div className="bg-primary/80 px-4 py-3 text-primary-foreground">
          <h1 className="text-xl font-bold">{titulo}</h1>
        </div>
        <div className="mt-4 rounded-md border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Esta seccion queda preparada para implementar mas adelante.
        </div>
      </section>
      <DetalleVacio />
    </div>
  );
}

function ResumenDato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
        <ReceiptText className="h-4 w-4" />
        {label}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function DetalleDato({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DetalleVacio() {
  return (
    <aside className="grid place-items-center p-6 text-center text-muted-foreground">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Selecciona un item del listado
      </div>
    </aside>
  );
}
