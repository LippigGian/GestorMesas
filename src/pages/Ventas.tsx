import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Filter, Plus, ReceiptText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocal } from "@/context/LocalContext";
import type { ArqueoCaja, ArqueoCajaMedioPago, Caja, MedioPago } from "@/lib/types";
import {
  cerrarArqueoCaja,
  crearArqueoCaja,
  obtenerArqueosCaja,
  obtenerDetalleMediosPagoArqueo,
  obtenerMontosSistemaMediosPagoArqueo,
} from "@/services/arqueosCajaService";
import { obtenerCajas } from "@/services/cajasService";
import { obtenerMesas, type MesaConPosicion } from "@/services/mesasService";
import { obtenerMediosPago } from "@/services/mediosPagoService";
import { obtenerTurnos } from "@/services/turnosService";
import {
  actualizarPagosVenta,
  obtenerVentas,
  type EstadoVentaFiltro,
  type TipoVentaFiltro,
  type VentaResumen,
} from "@/services/ventasService";

type VentasTab = "ventas" | "movimientos" | "arqueos" | "descuentos";

type PagoEdicion = {
  id: string;
  medioPagoId: string;
  monto: string;
};

function formatearFecha(value?: string) {
  if (!value) return "-";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;

  return fecha.toLocaleString();
}

function formatearMoneda(value: number) {
  return `$${value.toLocaleString()}`;
}

function claseDiferencia(value?: number) {
  if (value === undefined || Math.abs(value) < 0.01) {
    return "text-muted-foreground";
  }

  return value < 0 ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold";
}

function crearFechaHoraLocalAhora() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 16);
}

function crearFechaLocalHoy() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

function parseMonto(value: string, campo: string, permiteVacio = false) {
  const limpio = value.trim().replace(",", ".");

  if (permiteVacio && limpio === "") {
    return 0;
  }

  if (limpio === "") {
    throw new Error(`${campo} es obligatorio.`);
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
    throw new Error(`${campo} debe ser un numero valido.`);
  }

  const monto = Number(limpio);

  if (!Number.isFinite(monto) || monto < 0) {
    throw new Error(`${campo} debe ser mayor o igual a cero.`);
  }

  return monto;
}

function esMontoPositivoInput(value: string) {
  return /^\d*(?:[,.]\d{0,2})?$/.test(value);
}

function crearPagoEdicionId() {
  return crypto.randomUUID();
}

function agruparPagosPorMedio(venta: VentaResumen) {
  const pagosAgrupados = new Map<
    string,
    { medioPagoId: string; medioPagoNombre: string; monto: number }
  >();

  for (const pago of venta.pagos) {
    const actual = pagosAgrupados.get(pago.medioPagoId);

    if (actual) {
      actual.monto += pago.monto;
    } else {
      pagosAgrupados.set(pago.medioPagoId, {
        medioPagoId: pago.medioPagoId,
        medioPagoNombre: pago.medioPagoNombre,
        monto: pago.monto,
      });
    }
  }

  return Array.from(pagosAgrupados.values());
}

function crearPagosEdicionDesdeVenta(venta: VentaResumen, medioPagoDefaultId: string) {
  const pagosAgrupados = agruparPagosPorMedio(venta);

  if (pagosAgrupados.length === 0) {
    return [
      {
        id: crearPagoEdicionId(),
        medioPagoId: medioPagoDefaultId,
        monto: String(venta.total),
      },
    ];
  }

  return pagosAgrupados.map((pago) => ({
    id: crearPagoEdicionId(),
    medioPagoId: pago.medioPagoId,
    monto: String(pago.monto),
  }));
}

export function Ventas() {
  const { cargandoLocal, errorLocal, localId } = useLocal();
  const [tabActiva, setTabActiva] = useState<VentasTab>("ventas");
  const [arqueos, setArqueos] = useState<ArqueoCaja[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<ArqueoCaja | null>(null);
  const [cajaId, setCajaId] = useState("");
  const [montoInicial, setMontoInicial] = useState("");
  const [fechaHoraApertura, setFechaHoraApertura] = useState(crearFechaHoraLocalAhora);
  const [declaracionesCierre, setDeclaracionesCierre] = useState<Record<string, string>>({});
  const [detalleMediosSeleccionado, setDetalleMediosSeleccionado] = useState<
    ArqueoCajaMedioPago[]
  >([]);
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
    if (cargandoLocal) return;

    if (!localId) {
      setMediosPago([]);
      setErrorArqueos(errorLocal ?? "No hay un local activo configurado.");
      return;
    }

    const localIdActual = localId;
    let mounted = true;

    async function cargarDatos() {
      try {
        setCargandoArqueos(true);
        setErrorArqueos(null);
        const [arqueosDb, cajasDb, mediosPagoDb] = await Promise.all([
          obtenerArqueosCaja(localIdActual),
          obtenerCajas(localIdActual),
          obtenerMediosPago(localIdActual),
        ]);

        if (mounted) {
          setArqueos(arqueosDb);
          setCajas(cajasDb);
          setMediosPago(mediosPagoDb);
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
  }, [cargandoLocal, errorLocal, localId]);

  const abrirArqueo = async () => {
    if (!localId) {
      setErrorArqueos("No hay un local activo configurado.");
      return;
    }

    let monto = 0;

    try {
      monto = parseMonto(montoInicial, "El monto inicial");
    } catch (err) {
      setErrorArqueos(err instanceof Error ? err.message : "El monto inicial no es valido.");
      return;
    }

    if (!fechaHoraApertura || Number.isNaN(new Date(fechaHoraApertura).getTime())) {
      setErrorArqueos("Selecciona una fecha y hora de apertura valida.");
      return;
    }

    try {
      setGuardandoArqueo(true);
      setErrorArqueos(null);
      const creado = await crearArqueoCaja({
        localId,
        cajaId,
        montoInicial: monto,
        openedAt: fechaHoraApertura,
      });
      setArqueos((prev) => [creado, ...prev]);
      setArqueoSeleccionado(creado);
      setDetalleMediosSeleccionado([]);
      setMontoInicial("");
      setFechaHoraApertura(crearFechaHoraLocalAhora());
    } catch (err) {
      setErrorArqueos(err instanceof Error ? err.message : "No se pudo abrir el arqueo");
    } finally {
      setGuardandoArqueo(false);
    }
  };

  const cerrarArqueo = async () => {
    if (!arqueoAbierto) return;

    let declaraciones: Array<{ medioPagoId: string; montoDeclarado: number }> = [];

    try {
      declaraciones = mediosPago.map((medio) => ({
        medioPagoId: medio.id,
        montoDeclarado: parseMonto(
          declaracionesCierre[medio.id] ?? "",
          `El monto de ${medio.nombre}`,
          true
        ),
      }));
    } catch (err) {
      setErrorArqueos(err instanceof Error ? err.message : "Los montos declarados no son validos.");
      return;
    }

    try {
      setGuardandoArqueo(true);
      setErrorArqueos(null);
      const cerrado = await cerrarArqueoCaja({
        arqueoId: arqueoAbierto.id,
        declaraciones,
      });
      const detalle = await obtenerDetalleMediosPagoArqueo(cerrado.id);
      setArqueos((prev) => prev.map((arqueo) => (arqueo.id === cerrado.id ? cerrado : arqueo)));
      setArqueoSeleccionado(cerrado);
      setDetalleMediosSeleccionado(detalle);
      setDeclaracionesCierre({});
    } catch (err) {
      setErrorArqueos(err instanceof Error ? err.message : "No se pudo cerrar el arqueo");
    } finally {
      setGuardandoArqueo(false);
    }
  };

  const seleccionarArqueo = async (arqueo: ArqueoCaja) => {
    setArqueoSeleccionado(arqueo);

    try {
      const detalle =
        arqueo.estado === "abierto"
          ? await obtenerMontosSistemaMediosPagoArqueo(arqueo.id, localId ?? undefined)
          : await obtenerDetalleMediosPagoArqueo(arqueo.id);
      setDetalleMediosSeleccionado(detalle);
    } catch {
      setDetalleMediosSeleccionado([]);
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
          arqueoSeleccionado={arqueoSeleccionado}
          arqueos={arqueos}
          cajaId={cajaId}
          cajasActivas={cajasActivas}
          cargando={cargandoArqueos}
          error={errorArqueos}
          guardando={guardandoArqueo}
          fechaHoraApertura={fechaHoraApertura}
          declaracionesCierre={declaracionesCierre}
          detalleMediosSeleccionado={detalleMediosSeleccionado}
          mediosPago={mediosPago}
          montoInicial={montoInicial}
          saldoActual={saldoActual}
          totalVentas={totalVentas}
          onAbrirArqueo={abrirArqueo}
          onCerrarArqueo={cerrarArqueo}
          onSelectArqueo={seleccionarArqueo}
          setCajaId={setCajaId}
          setDeclaracionCierre={(medioPagoId, value) =>
            setDeclaracionesCierre((prev) => ({ ...prev, [medioPagoId]: value }))
          }
          setFechaHoraApertura={setFechaHoraApertura}
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
  const { cargandoLocal, errorLocal, localId } = useLocal();
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaResumen | null>(null);
  const [turnos, setTurnos] = useState<Awaited<ReturnType<typeof obtenerTurnos>>>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [mesas, setMesas] = useState<MesaConPosicion[]>([]);
  const [fechaDesde, setFechaDesde] = useState(crearFechaLocalHoy);
  const [fechaHasta, setFechaHasta] = useState(crearFechaLocalHoy);
  const [estado, setEstado] = useState<EstadoVentaFiltro>("todos");
  const [tipo, setTipo] = useState<TipoVentaFiltro>("todos");
  const [turnoId, setTurnoId] = useState("");
  const [medioPagoId, setMedioPagoId] = useState("");
  const [mesaId, setMesaId] = useState("");
  const [editandoPagos, setEditandoPagos] = useState(false);
  const [pagosEdicion, setPagosEdicion] = useState<PagoEdicion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPagos, setErrorPagos] = useState<string | null>(null);

  const cargarVentas = async () => {
    if (cargandoLocal) return;

    if (!localId) {
      setVentas([]);
      setVentaSeleccionada(null);
      setError(errorLocal ?? "No hay un local activo configurado.");
      return;
    }

    try {
      setCargando(true);
      setError(null);
      const turnoSeleccionado = turnos.find((turno) => turno.id === turnoId);
      const ventasDb = await obtenerVentas({
        localId,
        fechaDesde,
        fechaHasta,
        estado,
        tipo,
        turno: turnoSeleccionado
          ? {
              id: turnoSeleccionado.id,
              horaInicio: turnoSeleccionado.horaInicio,
              horaFin: turnoSeleccionado.horaFin,
            }
          : undefined,
        medioPagoId,
        mesaId,
      });
      setVentas(ventasDb);
      setVentaSeleccionada((actual) => {
        if (!actual) return ventasDb[0] ?? null;
        return ventasDb.find((venta) => venta.id === actual.id) ?? ventasDb[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las ventas");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (cargandoLocal) return;

    if (!localId) {
      setMediosPago([]);
      setError(errorLocal ?? "No hay un local activo configurado.");
      return;
    }

    const localIdActual = localId;
    let mounted = true;

    async function cargarOpciones() {
      try {
        const [turnosDb, mediosDb, mesasDb] = await Promise.all([
          obtenerTurnos(localIdActual),
          obtenerMediosPago(localIdActual),
          obtenerMesas(localIdActual),
        ]);

        if (mounted) {
          setTurnos(turnosDb.filter((turno) => turno.activo));
          setMediosPago(mediosDb);
          setMesas(mesasDb);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los filtros");
        }
      }
    }

    cargarOpciones();

    return () => {
      mounted = false;
    };
  }, [cargandoLocal, errorLocal, localId]);

  useEffect(() => {
    cargarVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoLocal, errorLocal, fechaDesde, fechaHasta, estado, tipo, turnoId, medioPagoId, mesaId, localId, turnos]);

  const resumen = useMemo(() => {
    const total = ventas.reduce((acc, venta) => acc + venta.total, 0);
    const personas = ventas.reduce((acc, venta) => acc + venta.personas, 0);
    const ventasCobradas = ventas.filter((venta) => venta.estado === "cerrado").length;

    return {
      cantidad: ventas.length,
      promedioVenta: ventas.length > 0 ? total / ventas.length : 0,
      personas,
      promedioPersona: personas > 0 ? total / personas : 0,
      total,
      ventasCobradas,
    };
  }, [ventas]);

  const seleccionarVenta = (venta: VentaResumen) => {
    setVentaSeleccionada(venta);
    setEditandoPagos(false);
    setErrorPagos(null);
    setPagosEdicion(crearPagosEdicionDesdeVenta(venta, mediosPago[0]?.id ?? ""));
  };

  const iniciarEdicionPagos = () => {
    if (!ventaSeleccionada) return;
    setError(null);
    setErrorPagos(null);
    setPagosEdicion(crearPagosEdicionDesdeVenta(ventaSeleccionada, mediosPago[0]?.id ?? ""));
    setEditandoPagos(true);
  };

  const actualizarPagoEdicion = (pagoId: string, patch: Partial<Omit<PagoEdicion, "id">>) => {
    setErrorPagos(null);
    setPagosEdicion((prev) =>
      prev.map((pago) => (pago.id === pagoId ? { ...pago, ...patch } : pago))
    );
  };

  const agregarPagoEdicion = () => {
    setErrorPagos(null);
    const totalActual = pagosEdicion.reduce((acc, pago) => {
      const monto = Number(pago.monto.replace(",", "."));
      return acc + (Number.isFinite(monto) ? monto : 0);
    }, 0);
    const restante = ventaSeleccionada ? Math.max(0, ventaSeleccionada.total - totalActual) : 0;

    setPagosEdicion((prev) => [
      ...prev,
      {
        id: crearPagoEdicionId(),
        medioPagoId: mediosPago[0]?.id ?? "",
        monto: restante > 0 ? String(restante) : "",
      },
    ]);
  };

  const quitarPagoEdicion = (pagoId: string) => {
    setErrorPagos(null);
    setPagosEdicion((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((pago) => pago.id !== pagoId);
    });
  };

  const guardarEdicionPagos = async () => {
    if (!ventaSeleccionada) return;

    if (pagosEdicion.length === 0) {
      setErrorPagos("Agrega al menos un pago.");
      return;
    }

    if (pagosEdicion.some((pago) => !pago.medioPagoId)) {
      setErrorPagos("Selecciona un medio de pago en cada linea.");
      return;
    }

    let pagosNormalizados: Array<{ medioPagoId: string; monto: number }> = [];

    try {
      pagosNormalizados = pagosEdicion.map((pago) => ({
        medioPagoId: pago.medioPagoId,
        monto: parseMonto(pago.monto, "El importe del pago"),
      }));
    } catch (err) {
      setErrorPagos(err instanceof Error ? err.message : "Revisa los importes de pago.");
      return;
    }

    const totalPagos = pagosNormalizados.reduce((acc, pago) => acc + pago.monto, 0);

    if (Math.abs(totalPagos - ventaSeleccionada.total) > 0.01) {
      setErrorPagos("La suma de los pagos debe coincidir con el total de la venta.");
      return;
    }

    try {
      setGuardandoPago(true);
      setError(null);
      setErrorPagos(null);
      const actualizada = await actualizarPagosVenta(ventaSeleccionada.id, pagosNormalizados);

      setVentas((prev) =>
        prev.map((venta) => (venta.id === actualizada.id ? actualizada : venta))
      );
      setVentaSeleccionada(actualizada);
      setPagosEdicion(crearPagosEdicionDesdeVenta(actualizada, mediosPago[0]?.id ?? ""));
      setEditandoPagos(false);
    } catch (err) {
      setErrorPagos(err instanceof Error ? err.message : "No se pudo actualizar el pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_420px]">
      <section className="border-r p-4">
        <div className="mb-4 flex items-center justify-between bg-primary/80 px-4 py-3 text-primary-foreground">
          <h1 className="text-xl font-bold">Ventas</h1>
          <Button disabled={cargando} type="button" variant="secondary" onClick={cargarVentas}>
            Actualizar
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="mb-4 rounded-md border bg-card">
          <div className="grid gap-3 border-b bg-muted p-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={turnoId}
              onChange={(event) => setTurnoId(event.target.value)}
            >
              <option value="">Todos los turnos</option>
              {turnos.map((turno) => (
                <option key={turno.id} value={turno.id}>
                  {turno.nombre}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={mesaId}
              onChange={(event) => setMesaId(event.target.value)}
            >
              <option value="">Todas las mesas</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.numero}
                </option>
              ))}
            </select>
            <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} />
            <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} />
          </div>
          <div className="grid gap-3 bg-muted/70 p-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={estado}
              onChange={(event) => setEstado(event.target.value as EstadoVentaFiltro)}
            >
              <option value="todos">Todos los estados</option>
              <option value="abierto">En curso</option>
              <option value="cerrado">Cerrada</option>
              <option value="cancelado">Cancelada</option>
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={tipo}
              onChange={(event) => setTipo(event.target.value as TipoVentaFiltro)}
            >
              <option value="todos">Todos los tipos</option>
              <option value="mesa">Mesa</option>
              <option value="mostrador">Mostrador</option>
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={medioPagoId}
              onChange={(event) => setMedioPagoId(event.target.value)}
            >
              <option value="">Todos los medios</option>
              {mediosPago.map((medio) => (
                <option key={medio.id} value={medio.id}>
                  {medio.nombre}
                </option>
              ))}
            </select>
            <Button disabled={cargando} type="button" variant="secondary" onClick={cargarVentas}>
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
          <div className="grid gap-4 border-t p-4 md:grid-cols-5">
            <ResumenDato label="Ventas" value={String(resumen.cantidad)} />
            <ResumenDato label="Promedio por venta" value={formatearMoneda(resumen.promedioVenta)} />
            <ResumenDato label="Personas" value={String(resumen.personas)} />
            <ResumenDato label="Promedio por persona" value={formatearMoneda(resumen.promedioPersona)} />
            <ResumenDato label="Total" value={formatearMoneda(resumen.total)} />
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
              {cargando ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                    Cargando ventas...
                  </td>
                </tr>
              ) : ventas.length > 0 ? (
                ventas.map((venta) => (
                  <tr
                    key={venta.id}
                    className={`cursor-pointer border-b transition hover:bg-muted/50 ${
                      ventaSeleccionada?.id === venta.id ? "bg-accent/20" : ""
                    }`}
                    onClick={() => seleccionarVenta(venta)}
                  >
                    <td className="p-3 font-semibold">{formatearFecha(venta.horaInicio)}</td>
                    <td className="p-3">{formatearFecha(venta.horaCierre)}</td>
                    <td className="p-3">
                      <EstadoVentaBadge estado={venta.estado} />
                    </td>
                    <td className="p-3">
                      {venta.tipo === "mesa" ? venta.mesaNumero ?? "-" : "Mostrador"}
                    </td>
                    <td className="p-3">{venta.cliente ?? "-"}</td>
                    <td className="p-3 text-right font-semibold">{formatearMoneda(venta.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                    No hay ventas para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>

      {ventaSeleccionada ? (
        <VentaDetalle
          editandoPagos={editandoPagos}
          errorPagos={errorPagos}
          guardandoPago={guardandoPago}
          mediosPago={mediosPago}
          pagosEdicion={pagosEdicion}
          venta={ventaSeleccionada}
          onAgregarPagoEdicion={agregarPagoEdicion}
          onCancelarEdicionPagos={() => setEditandoPagos(false)}
          onEditarPagos={iniciarEdicionPagos}
          onGuardarPagos={guardarEdicionPagos}
          onQuitarPagoEdicion={quitarPagoEdicion}
          onActualizarPagoEdicion={actualizarPagoEdicion}
        />
      ) : (
        <DetalleVacio />
      )}
    </div>
  );
}

type ArqueosCajaViewProps = {
  arqueoSeleccionado: ArqueoCaja | null;
  arqueos: ArqueoCaja[];
  cajaId: string;
  cajasActivas: Caja[];
  cargando: boolean;
  error: string | null;
  guardando: boolean;
  fechaHoraApertura: string;
  declaracionesCierre: Record<string, string>;
  detalleMediosSeleccionado: ArqueoCajaMedioPago[];
  mediosPago: MedioPago[];
  montoInicial: string;
  saldoActual: number;
  totalVentas: number;
  onAbrirArqueo: () => void;
  onCerrarArqueo: () => void;
  onSelectArqueo: (arqueo: ArqueoCaja) => void;
  setCajaId: (value: string) => void;
  setDeclaracionCierre: (medioPagoId: string, value: string) => void;
  setFechaHoraApertura: (value: string) => void;
  setMontoInicial: (value: string) => void;
};

function ArqueosCajaView({
  arqueoSeleccionado,
  arqueos,
  cajaId,
  cajasActivas,
  cargando,
  error,
  guardando,
  fechaHoraApertura,
  declaracionesCierre,
  detalleMediosSeleccionado,
  mediosPago,
  montoInicial,
  saldoActual,
  totalVentas,
  onAbrirArqueo,
  onCerrarArqueo,
  onSelectArqueo,
  setCajaId,
  setDeclaracionCierre,
  setFechaHoraApertura,
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

        <div className="mb-4 grid gap-3 rounded-md border bg-muted p-3 md:grid-cols-[1fr_1fr_1fr]">
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={cajaId}
            onChange={(event) => setCajaId(event.target.value)}
          >
            {cajasActivas.length === 0 && <option value="">Sin cajas activas</option>}
            {cajasActivas.map((caja) => (
              <option key={caja.id} value={caja.id}>
                {caja.nombre}
              </option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={fechaHoraApertura}
            onChange={(event) => setFechaHoraApertura(event.target.value)}
          />
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              $
            </span>
            <Input
              className="pl-7"
              min={0}
              step={0.01}
              placeholder="Monto inicial"
              inputMode="decimal"
              type="text"
              value={montoInicial}
              onChange={(event) => {
                const value = event.target.value;
                if (esMontoPositivoInput(value)) {
                  setMontoInicial(value);
                }
              }}
            />
          </div>
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
                    <td className={`p-3 text-right ${claseDiferencia(arqueo.diferencia)}`}>
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
          <div className="mt-4 rounded-md border bg-card p-4 text-sm shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Medios de pago</h3>
              {arqueoSeleccionado.estado === "abierto" && (
                <Button
                  disabled={guardando || mediosPago.length === 0}
                  type="button"
                  onClick={onCerrarArqueo}
                >
                  Cerrar caja
                </Button>
              )}
            </div>
            {arqueoSeleccionado.estado === "abierto" ? (
              <div className="space-y-2">
                {mediosPago.map((medio) => {
                  const detalle = detalleMediosSeleccionado.find(
                    (item) => item.medioPagoId === medio.id
                  );
                  const montoSistema = detalle?.montoSistema ?? 0;
                  const montoUsuario = Number(
                    (declaracionesCierre[medio.id] ?? "0").replace(",", ".")
                  );
                  const diferencia =
                    (Number.isFinite(montoUsuario) ? montoUsuario : 0) - montoSistema;

                  return (
                    <div key={medio.id} className="rounded-md border p-3">
                      <div className="mb-2 font-medium">{medio.nombre}</div>
                      <DetalleDato label="Sistema" value={formatearMoneda(montoSistema)} />
                      <label className="mt-2 block text-xs font-medium text-muted-foreground">
                        Usuario
                        <div className="relative mt-1">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                            $
                          </span>
                          <Input
                            className="pl-7"
                            inputMode="decimal"
                            placeholder="0"
                            type="text"
                            value={declaracionesCierre[medio.id] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (esMontoPositivoInput(value)) {
                                setDeclaracionCierre(medio.id, value);
                              }
                            }}
                          />
                        </div>
                      </label>
                      <DetalleDato
                        label="Diferencia"
                        value={formatearMoneda(diferencia)}
                        valueClassName={claseDiferencia(diferencia)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : detalleMediosSeleccionado.length > 0 ? (
              <div className="space-y-2">
                {detalleMediosSeleccionado.map((detalle) => (
                  <div key={detalle.medioPagoId} className="rounded-md border p-3">
                    <div className="mb-2 font-medium">{detalle.medioPagoNombre ?? "Medio de pago"}</div>
                    <DetalleDato label="Sistema" value={formatearMoneda(detalle.montoSistema)} />
                    <DetalleDato label="Usuario" value={formatearMoneda(detalle.montoDeclarado)} />
                    <DetalleDato
                      label="Diferencia"
                      value={formatearMoneda(detalle.diferencia)}
                      valueClassName={claseDiferencia(detalle.diferencia)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                El detalle por medio de pago aparece cuando se cierra el arqueo.
              </p>
            )}
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

function EstadoVentaBadge({ estado }: { estado: VentaResumen["estado"] }) {
  const estilos = {
    abierto: "border-destructive/40 bg-destructive/10 text-destructive",
    cerrado: "border-emerald-500/30 bg-emerald-50 text-emerald-700",
    cancelado: "border-muted bg-muted text-muted-foreground",
  };
  const label = {
    abierto: "En curso",
    cerrado: "Cerrada",
    cancelado: "Cancelada",
  };

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${estilos[estado]}`}>
      {label[estado]}
    </span>
  );
}

function VentaDetalle({
  editandoPagos,
  errorPagos,
  guardandoPago,
  mediosPago,
  pagosEdicion,
  venta,
  onAgregarPagoEdicion,
  onCancelarEdicionPagos,
  onEditarPagos,
  onGuardarPagos,
  onQuitarPagoEdicion,
  onActualizarPagoEdicion,
}: {
  editandoPagos: boolean;
  errorPagos: string | null;
  guardandoPago: boolean;
  mediosPago: MedioPago[];
  pagosEdicion: PagoEdicion[];
  venta: VentaResumen;
  onAgregarPagoEdicion: () => void;
  onCancelarEdicionPagos: () => void;
  onEditarPagos: () => void;
  onGuardarPagos: () => void;
  onQuitarPagoEdicion: (pagoId: string) => void;
  onActualizarPagoEdicion: (pagoId: string, patch: Partial<Omit<PagoEdicion, "id">>) => void;
}) {
  const puedeEditarPagos =
    venta.estado === "cerrado" && venta.pagos.some((pago) => Boolean(pago.arqueoCajaId));
  const pagosAgrupados = agruparPagosPorMedio(venta);
  const totalPagosEdicion = pagosEdicion.reduce((acc, pago) => {
    const monto = Number(pago.monto.replace(",", "."));
    return acc + (Number.isFinite(monto) ? monto : 0);
  }, 0);
  const diferenciaPagosEdicion = totalPagosEdicion - venta.total;

  return (
    <aside className="p-6">
      <h2 className="mb-4 text-xl font-bold">Detalle de venta</h2>
      <div className="space-y-3 rounded-md border bg-card p-4 text-sm shadow-sm">
        <DetalleDato label="Estado" value={venta.estado === "abierto" ? "En curso" : venta.estado} />
        <DetalleDato label="Tipo" value={venta.tipo === "mesa" ? "Mesa" : "Mostrador"} />
        <DetalleDato
          label="Mesa"
          value={venta.tipo === "mesa" ? venta.mesaNumero ?? "-" : "Mostrador"}
        />
        <DetalleDato label="Cliente" value={venta.cliente ?? "-"} />
        <DetalleDato label="Turno" value={venta.turnoNombre ?? "-"} />
        <DetalleDato label="Inicio" value={formatearFecha(venta.horaInicio)} />
        <DetalleDato label="Cierre" value={formatearFecha(venta.horaCierre)} />
        <DetalleDato label="Personas" value={String(venta.personas)} />
        <DetalleDato label="Total" value={formatearMoneda(venta.total)} />
      </div>

      <div className="mt-4 rounded-md border bg-card p-4 text-sm shadow-sm">
        <h3 className="mb-3 font-semibold">Productos</h3>
        {venta.items.length > 0 ? (
          <div className="space-y-2">
            {venta.items.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.nombreProducto}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.cantidad} x {formatearMoneda(item.precioUnitario)}
                    </p>
                  </div>
                  <span className="font-semibold">{formatearMoneda(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay productos cargados.</p>
        )}
      </div>

      <div className="mt-4 rounded-md border bg-card p-4 text-sm shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Pagos</h3>
          {!editandoPagos && (
            <Button
              disabled={!puedeEditarPagos}
              size="sm"
              type="button"
              variant="secondary"
              onClick={onEditarPagos}
            >
              Editar pago
            </Button>
          )}
        </div>
        {editandoPagos ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                disabled={guardandoPago || mediosPago.length === 0}
                size="sm"
                type="button"
                variant="secondary"
                onClick={onAgregarPagoEdicion}
              >
                <Plus className="h-4 w-4" />
                Agregar pago
              </Button>
            </div>
            {errorPagos && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errorPagos}
              </div>
            )}
            {pagosEdicion.map((pago) => (
              <div key={pago.id} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
                <label className="block text-sm font-medium">
                  Medio
                  <select
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                    value={pago.medioPagoId}
                    onChange={(event) =>
                      onActualizarPagoEdicion(pago.id, { medioPagoId: event.target.value })
                    }
                  >
                    <option value="">Seleccionar</option>
                    {mediosPago.map((medio) => (
                      <option key={medio.id} value={medio.id}>
                        {medio.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Importe
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    type="text"
                    value={pago.monto}
                    onChange={(event) =>
                      onActualizarPagoEdicion(pago.id, { monto: event.target.value })
                    }
                  />
                </label>
                <Button
                  disabled={guardandoPago || pagosEdicion.length === 1}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => onQuitarPagoEdicion(pago.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <DetalleDato label="Total venta" value={formatearMoneda(venta.total)} />
            <DetalleDato label="Total pagos" value={formatearMoneda(totalPagosEdicion)} />
            <DetalleDato
              label="Diferencia"
              value={formatearMoneda(diferenciaPagosEdicion)}
              valueClassName={claseDiferencia(diferenciaPagosEdicion)}
            />
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                disabled={guardandoPago}
                size="sm"
                type="button"
                variant="secondary"
                onClick={onCancelarEdicionPagos}
              >
                Cancelar
              </Button>
              <Button disabled={guardandoPago} size="sm" type="button" onClick={onGuardarPagos}>
                Guardar
              </Button>
            </div>
          </div>
        ) : pagosAgrupados.length > 0 ? (
          <div className="space-y-2">
            {pagosAgrupados.map((pago) => (
              <DetalleDato
                key={pago.medioPagoId}
                label={pago.medioPagoNombre}
                value={formatearMoneda(pago.monto)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Esta venta todavia no tiene pagos registrados.
          </p>
        )}
      </div>
    </aside>
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

function DetalleDato({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClassName ?? ""}`}>{value}</span>
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
