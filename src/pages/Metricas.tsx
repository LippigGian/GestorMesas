import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CalendarDays, CreditCard, Package, RefreshCw, ShoppingBag, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { desplazarFecha, fechaNegocio, resumirMetricas, validarRango, type DatosMetricas, type GrupoImporte, type RangoMetricas } from "@/lib/metricas";
import { useLocal } from "@/context/LocalContext";
import { obtenerMetricas } from "@/services/metricasService";
import "./Metricas.css";

const moneda = (valor: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(valor);
const numero = (valor: number) => valor.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const porcentaje = (valor: number, total: number) => total ? `${(valor / total * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%` : "0%";
const etiquetaFecha = (fecha: string, mes = false) => new Intl.DateTimeFormat("es-AR", mes ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${fecha}${mes ? "-01" : ""}T12:00:00Z`));

function EvolucionVentas({ periodos, mensual }: { periodos: { fecha: string; importe: number; cantidad: number }[]; mensual: boolean }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    const node = contenedor.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setAncho(Math.max(260, entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...periodos.map((periodo) => periodo.importe));
  const margen = 62;
  const x = (i: number) => margen + (periodos.length === 1 ? (ancho - margen - 16) / 2 : i / (periodos.length - 1) * (ancho - margen - 16));
  const y = (valor: number) => 188 - valor / max * 152;
  const puntos = periodos.map((periodo, i) => `${x(i)},${y(periodo.importe)}`).join(" ");
  const ticks = [...new Set([0, Math.floor((periodos.length - 1) / 2), periodos.length - 1])];
  return <>
    <div ref={contenedor} className="metricas-chart">
      <svg width="100%" height="232" role="img" aria-label={`Ventas ${mensual ? "por mes" : "por día"}. Valores exactos disponibles en la tabla de detalle.`}>
        {[0, 0.5, 1].map((fraccion) => <g key={fraccion}>
          <line x1={margen} x2={ancho - 16} y1={y(max * fraccion)} y2={y(max * fraccion)} className="metricas-gridline" />
          <text x={margen - 8} y={y(max * fraccion) + 4} textAnchor="end" className="metricas-axis">{new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(max * fraccion)}</text>
        </g>)}
        <text x={0} y={16} className="metricas-axis">ARS</text>
        <polyline points={puntos} fill="none" className="metricas-trend" />
        {periodos.map((periodo, i) => <circle key={periodo.fecha} cx={x(i)} cy={y(periodo.importe)} r={periodos.length > 62 ? 2 : 3.5} className="metricas-point">
          <title>{etiquetaFecha(periodo.fecha, mensual)}: {moneda(periodo.importe)} · {periodo.cantidad} ventas</title>
        </circle>)}
        {ticks.map((i) => <text key={i} x={x(i)} y={218} textAnchor={i === 0 ? "start" : i === periodos.length - 1 ? "end" : "middle"} className="metricas-axis">{etiquetaFecha(periodos[i].fecha, mensual)}</text>)}
      </svg>
    </div>
    <details className="metricas-details"><summary>Ver importes por {mensual ? "mes" : "día"}</summary>
      <div className="metricas-table-wrap"><table><caption className="sr-only">Detalle de ventas por período</caption><thead><tr><th scope="col">{mensual ? "Mes" : "Día"}</th><th scope="col">Ventas cerradas</th><th scope="col">Importe</th></tr></thead>
        <tbody>{periodos.map((periodo) => <tr key={periodo.fecha}><td>{etiquetaFecha(periodo.fecha, mensual)}</td><td>{numero(periodo.cantidad)}</td><td>{moneda(periodo.importe)}</td></tr>)}</tbody>
      </table></div>
    </details>
  </>;
}

function Desglose({ grupos, total, tipo }: { grupos: GrupoImporte[]; total: number; tipo: "pagos" | "gastos" }) {
  if (!grupos.length) return <p className="metricas-empty">No hay {tipo === "pagos" ? "cobros" : "gastos"} registrados en este período.</p>;
  return <ul className="metricas-breakdown">{grupos.map((grupo) => <li key={grupo.id}>
    <div className="metricas-breakdown-label"><span>{grupo.nombre}</span><strong>{moneda(grupo.importe)}</strong></div>
    <div className="metricas-bar" aria-hidden="true"><span style={{ width: `${total > 0 ? Math.min(100, Math.max(0, grupo.importe / total * 100)) : 0}%` }} /></div>
    <div className="metricas-breakdown-note"><span>{numero(grupo.cantidad)} {tipo === "pagos" ? "cobros" : "gastos"}</span><span>{porcentaje(grupo.importe, total)}</span></div>
  </li>)}</ul>;
}

export function Metricas() {
  const { localId } = useLocal();
  const hoy = fechaNegocio();
  const [rango, setRango] = useState<RangoMetricas>(() => ({ desde: `${hoy.slice(0, 7)}-01`, hasta: hoy }));
  const [borrador, setBorrador] = useState(rango);
  const [agrupacion, setAgrupacion] = useState<"dia" | "mes">("dia");
  const [ordenProductos, setOrdenProductos] = useState<"cantidad" | "importe">("cantidad");
  const [datos, setDatos] = useState<DatosMetricas | null>(null);
  const [error, setError] = useState("");
  const [errorFiltro, setErrorFiltro] = useState("");
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    if (!localId) return;
    const controller = new AbortController();
    setCargando(true);
    setDatos(null);
    setError("");
    obtenerMetricas(rango, controller.signal, localId).then((resultado) => {
      if (!controller.signal.aborted) setDatos(resultado);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
    }).finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [rango, recarga, localId]);
  const resumen = useMemo(() => datos ? resumirMetricas(datos, rango, agrupacion) : null, [datos, rango, agrupacion]);
  const productos = useMemo(() => {
    const filas = [...(resumen?.productos ?? [])];
    return ordenProductos === "importe" ? filas.sort((a, b) => b.importe - a.importe || b.cantidad - a.cantidad) : filas;
  }, [resumen, ordenProductos]);
  const aplicar = (nuevo: RangoMetricas) => {
    const mensaje = validarRango(nuevo);
    setErrorFiltro(mensaje ?? "");
    if (!mensaje) { setBorrador(nuevo); setRango(nuevo); }
  };
  const mesAnteriorFin = desplazarFecha(`${hoy.slice(0, 7)}-01`, -1);
  const shortcuts = [
    { nombre: "Hoy", desde: hoy, hasta: hoy },
    { nombre: "Últimos 7 días", desde: desplazarFecha(hoy, -6), hasta: hoy },
    { nombre: "Este mes", desde: `${hoy.slice(0, 7)}-01`, hasta: hoy },
    { nombre: "Mes anterior", desde: `${mesAnteriorFin.slice(0, 7)}-01`, hasta: mesAnteriorFin },
  ];
  return <main className="metricas-page">
    <header className="metricas-heading"><div><span className="metricas-eyebrow">Análisis del negocio</span><h1>Métricas</h1><p>Ventas, productos, cobros y gastos en un mismo lugar.</p></div>
      <Button variant="outline" disabled={cargando} onClick={() => setRecarga((n) => n + 1)}><RefreshCw aria-hidden="true" className={cargando ? "h-4 w-4 animate-spin motion-reduce:animate-none" : "h-4 w-4"} />Actualizar</Button>
    </header>
    <section className="metricas-filters" aria-label="Filtro de fechas">
      <div className="metricas-shortcuts">{shortcuts.map((shortcut) => <Button key={shortcut.nombre} variant="ghost" aria-pressed={rango.desde === shortcut.desde && rango.hasta === shortcut.hasta} onClick={() => aplicar({ desde: shortcut.desde, hasta: shortcut.hasta })}>{shortcut.nombre}</Button>)}</div>
      <form className="metricas-date-form" onSubmit={(event) => { event.preventDefault(); aplicar(borrador); }}>
        <label htmlFor="metricas-desde">Desde<Input id="metricas-desde" type="date" required value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} /></label>
        <label htmlFor="metricas-hasta">Hasta<Input id="metricas-hasta" type="date" required value={borrador.hasta} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} /></label>
        <Button type="submit"><CalendarDays className="h-4 w-4" aria-hidden="true" />Aplicar período</Button>
      </form>
      {errorFiltro && <p role="alert" className="text-sm text-destructive">{errorFiltro}</p>}
      <p className="metricas-period">Período: {rango.desde.split("-").reverse().join("/")} — {rango.hasta.split("-").reverse().join("/")} · Hora de Argentina · ARS</p>
    </section>
    <div aria-live="polite" role="status" className="metricas-load-status">{cargando ? "Cargando métricas del período…" : datos ? "Métricas actualizadas." : ""}</div>
    {error && <div role="alert" className="metricas-error"><p>{error}</p><Button variant="outline" onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button></div>}
    {cargando && <div className="metricas-loading" aria-hidden="true">{[0, 1, 2, 3].map((n) => <div key={n} />)}</div>}
    {resumen && !cargando && <>
      <section className="metricas-stats" aria-label="Resumen del período">
        {[{ titulo: "Ventas cerradas", valor: moneda(resumen.totalVentas), nota: "Importe final, con descuentos", icon: BarChart3 },
          { titulo: "Pedidos vendidos", valor: numero(resumen.cantidadVentas), nota: "Solo pedidos cerrados", icon: ShoppingBag },
          { titulo: "Ticket promedio", valor: moneda(resumen.ticketPromedio), nota: "Ventas ÷ pedidos cerrados", icon: CreditCard },
          { titulo: "Gastos registrados", valor: moneda(resumen.totalGastos), nota: `${numero(resumen.cantidadGastos)} gastos en el período`, icon: Wallet }].map(({ titulo, valor, nota, icon: Icon }) => <article key={titulo} className="metricas-stat"><div><span>{titulo}</span><Icon className="h-4 w-4" aria-hidden="true" /></div><strong>{valor}</strong><p>{nota}</p></article>)}
      </section>
      <section className="metricas-panel metricas-evolution">
        <div className="metricas-panel-heading"><div><h2>Evolución de ventas</h2><p>Por fecha de cierre. No incluye pedidos en curso ni cancelados.</p></div>
          <div className="metricas-segment" role="group" aria-label="Agrupación de ventas"><button aria-pressed={agrupacion === "dia"} onClick={() => setAgrupacion("dia")}>Por día</button><button aria-pressed={agrupacion === "mes"} onClick={() => setAgrupacion("mes")}>Por mes</button></div>
        </div>
        {resumen.cantidadVentas ? <EvolucionVentas periodos={resumen.periodos} mensual={agrupacion === "mes"} /> : <p className="metricas-empty">No hay ventas cerradas en este período. Probá ampliar el rango de fechas.</p>}
      </section>
      <div className="metricas-lower-grid">
        <section className="metricas-panel metricas-products"><div className="metricas-panel-heading"><div><h2><Package className="h-4 w-4" aria-hidden="true" />Productos más vendidos</h2><p>Pedidos cerrados · importes por producto antes de descuentos generales.</p></div><label className="metricas-sort" htmlFor="metricas-orden">Ordenar por<select id="metricas-orden" value={ordenProductos} onChange={(e) => setOrdenProductos(e.target.value as "cantidad" | "importe")}><option value="cantidad">Cantidad</option><option value="importe">Importe</option></select></label></div>
          {!productos.length ? <p className="metricas-empty">No hay productos vendidos en este período.</p> : <><div className="metricas-table-wrap"><table><caption className="sr-only">Diez productos más vendidos, ordenados por {ordenProductos}</caption><thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Importe</th></tr></thead><tbody>{productos.slice(0, 10).map((producto) => <tr key={producto.id}><td>{producto.nombre}</td><td>{numero(producto.cantidad)}</td><td>{moneda(producto.importe)}</td></tr>)}</tbody></table></div>
            {productos.length > 10 && <details className="metricas-details"><summary>Ver los {productos.length} productos</summary><div className="metricas-table-wrap"><table><caption className="sr-only">Todos los productos vendidos</caption><thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Importe</th></tr></thead><tbody>{productos.map((producto) => <tr key={producto.id}><td>{producto.nombre}</td><td>{numero(producto.cantidad)}</td><td>{moneda(producto.importe)}</td></tr>)}</tbody></table></div></details>}</>}
        </section>
        <section className="metricas-panel"><div className="metricas-panel-heading"><div><h2>Medios de pago</h2><p>Por fecha del cobro, incluidos pagos parciales y de pedidos cancelados.</p></div></div><p className="metricas-section-total">{moneda(resumen.totalCobros)}<span>Cobros registrados</span></p><Desglose grupos={resumen.medios} total={resumen.totalCobros} tipo="pagos" /></section>
        <section className="metricas-panel"><div className="metricas-panel-heading"><div><h2>Gastos por categoría</h2><p>Por fecha del gasto y categoría registrada.</p></div></div><p className="metricas-section-total">{moneda(resumen.totalGastos)}<span>Gastos registrados</span></p><Desglose grupos={resumen.categorias} total={resumen.totalGastos} tipo="gastos" /></section>
      </div>
    </>}
  </main>;
}
