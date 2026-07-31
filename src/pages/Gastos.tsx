import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Gasto, MedioPago } from "@/lib/types";
import {
  actualizarGasto,
  crearGasto,
  eliminarGasto,
  obtenerGastos,
  type GastoInput,
} from "@/services/gastosService";
import { obtenerMediosPago } from "@/services/mediosPagoService";

function formatearFecha(value?: string) {
  if (!value) return "-";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;

  return fecha.toLocaleString();
}

function formatearMoneda(value: number) {
  return `$${value.toLocaleString()}`;
}

function crearFechaHoraLocalAhora() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 16);
}

function fechaInputDesdeIso(value: string) {
  const fecha = new Date(value);
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 16);
}

function parseImporte(value: string) {
  const limpio = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
    throw new Error("El importe debe ser un numero valido.");
  }

  const importe = Number(limpio);

  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error("El importe debe ser mayor a cero.");
  }

  return importe;
}

type GastoFormState = {
  fecha: string;
  importe: string;
  proveedor: string;
  categoria: string;
  comentario: string;
  medioPagoId: string;
};

const crearFormVacio = (medioPagoId = ""): GastoFormState => ({
  fecha: crearFechaHoraLocalAhora(),
  importe: "",
  proveedor: "",
  categoria: "",
  comentario: "",
  medioPagoId,
});

function formDesdeGasto(gasto: Gasto): GastoFormState {
  return {
    fecha: fechaInputDesdeIso(gasto.fecha),
    importe: String(gasto.importe),
    proveedor: gasto.proveedor ?? "",
    categoria: gasto.categoria ?? "",
    comentario: gasto.comentario ?? "",
    medioPagoId: gasto.medioPagoId,
  };
}

export function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null);
  const [modoPanel, setModoPanel] = useState<"vacio" | "detalle" | "nuevo" | "editar">("vacio");
  const [form, setForm] = useState<GastoFormState>(crearFormVacio);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalGastos = useMemo(
    () => gastos.reduce((acc, gasto) => acc + gasto.importe, 0),
    [gastos]
  );

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);
      const [gastosDb, mediosDb] = await Promise.all([obtenerGastos(), obtenerMediosPago()]);
      setGastos(gastosDb);
      setMediosPago(mediosDb);
      setForm((prev) => ({
        ...prev,
        medioPagoId: prev.medioPagoId || mediosDb[0]?.id || "",
      }));
      setGastoSeleccionado((actual) => {
        if (!actual) return gastosDb[0] ?? null;
        return gastosDb.find((gasto) => gasto.id === actual.id) ?? gastosDb[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los gastos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirNuevo = () => {
    setError(null);
    setGastoSeleccionado(null);
    setForm(crearFormVacio(mediosPago[0]?.id ?? ""));
    setModoPanel("nuevo");
  };

  const seleccionarGasto = (gasto: Gasto) => {
    setError(null);
    setGastoSeleccionado(gasto);
    setModoPanel("detalle");
  };

  const editarGasto = (gasto: Gasto) => {
    setError(null);
    setGastoSeleccionado(gasto);
    setForm(formDesdeGasto(gasto));
    setModoPanel("editar");
  };

  const buildInput = (): GastoInput => {
    if (!form.fecha || Number.isNaN(new Date(form.fecha).getTime())) {
      throw new Error("Selecciona una fecha valida.");
    }

    if (!form.medioPagoId) {
      throw new Error("Selecciona un medio de pago.");
    }

    return {
      fecha: form.fecha,
      importe: parseImporte(form.importe),
      proveedor: form.proveedor,
      categoria: form.categoria,
      comentario: form.comentario,
      medioPagoId: form.medioPagoId,
    };
  };

  const guardarGasto = async () => {
    let input: GastoInput;

    try {
      input = buildInput();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los datos del gasto.");
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      const guardado =
        modoPanel === "editar" && gastoSeleccionado
          ? await actualizarGasto(gastoSeleccionado.id, input)
          : await crearGasto(input);

      setGastos((prev) => {
        const existe = prev.some((gasto) => gasto.id === guardado.id);
        const next = existe
          ? prev.map((gasto) => (gasto.id === guardado.id ? guardado : gasto))
          : [guardado, ...prev];

        return next.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      });
      setGastoSeleccionado(guardado);
      setModoPanel("detalle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el gasto");
    } finally {
      setGuardando(false);
    }
  };

  const borrarGasto = async (gasto: Gasto) => {
    if (!window.confirm("Eliminar este gasto?")) return;

    try {
      setGuardando(true);
      setError(null);
      await eliminarGasto(gasto);
      setGastos((prev) => prev.filter((item) => item.id !== gasto.id));
      setGastoSeleccionado(null);
      setModoPanel("vacio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el gasto");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="grid min-h-[calc(100vh-128px)] grid-cols-[minmax(0,1fr)_420px] bg-background">
      <section className="border-r p-4">
        <div className="mb-4 flex items-center justify-between bg-primary/80 px-4 py-3 text-primary-foreground">
          <h1 className="text-xl font-bold">Gastos</h1>
          <Button type="button" variant="secondary" onClick={abrirNuevo}>
            <Plus className="h-4 w-4" />
            Nuevo gasto
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="mb-4 grid gap-4 rounded-md border bg-card p-4 md:grid-cols-3">
          <ResumenDato label="Gastos" value={String(gastos.length)} />
          <ResumenDato label="Total" value={formatearMoneda(totalGastos)} />
          <ResumenDato
            label="Arqueo abierto"
            value={gastos.some((gasto) => gasto.arqueoCajaEstado === "abierto") ? "Con gastos" : "-"}
          />
        </section>

        <section className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Proveedor</th>
                <th className="p-3 text-left">Categoria</th>
                <th className="p-3 text-left">Medio</th>
                <th className="p-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                    Cargando gastos...
                  </td>
                </tr>
              ) : gastos.length > 0 ? (
                gastos.map((gasto) => (
                  <tr
                    key={gasto.id}
                    className={`cursor-pointer border-b transition hover:bg-muted/50 ${
                      gastoSeleccionado?.id === gasto.id ? "bg-accent/20" : ""
                    }`}
                    onClick={() => seleccionarGasto(gasto)}
                  >
                    <td className="p-3 font-semibold">{formatearFecha(gasto.fecha)}</td>
                    <td className="p-3">{gasto.proveedor ?? "-"}</td>
                    <td className="p-3">{gasto.categoria ?? "-"}</td>
                    <td className="p-3">{gasto.medioPagoNombre ?? "-"}</td>
                    <td className="p-3 text-right font-semibold">{formatearMoneda(gasto.importe)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                    Todavia no hay gastos cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>

      <GastoPanel
        form={form}
        gasto={gastoSeleccionado}
        guardando={guardando}
        mediosPago={mediosPago}
        modo={modoPanel}
        onCancelar={() => {
          setModoPanel(gastoSeleccionado ? "detalle" : "vacio");
          setError(null);
        }}
        onChange={setForm}
        onEditar={editarGasto}
        onEliminar={borrarGasto}
        onGuardar={guardarGasto}
      />
    </main>
  );
}

function GastoPanel({
  form,
  gasto,
  guardando,
  mediosPago,
  modo,
  onCancelar,
  onChange,
  onEditar,
  onEliminar,
  onGuardar,
}: {
  form: GastoFormState;
  gasto: Gasto | null;
  guardando: boolean;
  mediosPago: MedioPago[];
  modo: "vacio" | "detalle" | "nuevo" | "editar";
  onCancelar: () => void;
  onChange: (form: GastoFormState) => void;
  onEditar: (gasto: Gasto) => void;
  onEliminar: (gasto: Gasto) => void;
  onGuardar: () => void;
}) {
  if (modo === "vacio") {
    return (
      <aside className="grid place-items-center p-6 text-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Selecciona un gasto o crea uno nuevo
        </div>
      </aside>
    );
  }

  if (modo === "detalle" && gasto) {
    const puedeModificar = gasto.arqueoCajaEstado === "abierto";

    return (
      <aside className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Detalle de gasto</h2>
          <div className="flex gap-2">
            <Button
              disabled={!puedeModificar || guardando}
              size="icon"
              type="button"
              variant="secondary"
              onClick={() => onEditar(gasto)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              disabled={!puedeModificar || guardando}
              size="icon"
              type="button"
              variant="destructive"
              onClick={() => onEliminar(gasto)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-md border bg-card p-4 text-sm shadow-sm">
          <DetalleDato label="Fecha" value={formatearFecha(gasto.fecha)} />
          <DetalleDato label="Importe" value={formatearMoneda(gasto.importe)} />
          <DetalleDato label="Proveedor" value={gasto.proveedor ?? "-"} />
          <DetalleDato label="Categoria" value={gasto.categoria ?? "-"} />
          <DetalleDato label="Medio de pago" value={gasto.medioPagoNombre ?? "-"} />
          <DetalleDato label="Arqueo" value={gasto.arqueoCajaEstado ?? "-"} />
        </div>

        <div className="mt-4 rounded-md border bg-card p-4 text-sm shadow-sm">
          <h3 className="mb-2 font-semibold">Comentario</h3>
          <p className="text-muted-foreground">{gasto.comentario || "Sin comentario."}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="p-6">
      <h2 className="mb-4 text-xl font-bold">{modo === "nuevo" ? "Nuevo gasto" : "Editar gasto"}</h2>
      <div className="space-y-4 rounded-md border bg-card p-4 text-sm shadow-sm">
        <label className="block text-sm font-medium">
          Fecha del gasto
          <Input
            className="mt-1"
            type="datetime-local"
            value={form.fecha}
            onChange={(event) => onChange({ ...form, fecha: event.target.value })}
          />
        </label>

        <label className="block text-sm font-medium">
          Importe
          <Input
            className="mt-1"
            inputMode="decimal"
            placeholder="$0"
            type="text"
            value={form.importe}
            onChange={(event) => onChange({ ...form, importe: event.target.value })}
          />
        </label>

        <label className="block text-sm font-medium">
          Proveedor
          <Input
            className="mt-1"
            value={form.proveedor}
            onChange={(event) => onChange({ ...form, proveedor: event.target.value })}
          />
        </label>

        <label className="block text-sm font-medium">
          Categoria
          <Input
            className="mt-1"
            value={form.categoria}
            onChange={(event) => onChange({ ...form, categoria: event.target.value })}
          />
        </label>

        <label className="block text-sm font-medium">
          Comentario
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.comentario}
            onChange={(event) => onChange({ ...form, comentario: event.target.value })}
          />
        </label>

        <label className="block text-sm font-medium">
          Medio de pago
          <select
            className="mt-1 h-10 w-full rounded-md border bg-background px-3"
            value={form.medioPagoId}
            onChange={(event) => onChange({ ...form, medioPagoId: event.target.value })}
          >
            <option value="">Seleccionar medio</option>
            {mediosPago.map((medio) => (
              <option key={medio.id} value={medio.id}>
                {medio.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button disabled={guardando} type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button disabled={guardando} type="button" onClick={onGuardar}>
            Guardar
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ResumenDato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-sm text-muted-foreground">{label}</div>
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
