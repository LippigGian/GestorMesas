export const ZONA_METRICAS = "America/Argentina/Buenos_Aires";
export type RangoMetricas = { desde: string; hasta: string };
export type VentaMetrica = { id: string; estado: string; fecha: string; total: number };
export type ItemMetrica = { pedidoId: string; productoId: string | null; nombre: string; cantidad: number; subtotal: number };
export type PagoMetrica = { medioId: string; nombre: string; monto: number };
export type GastoMetrica = { categoria: string; importe: number };
export type DatosMetricas = { ventas: VentaMetrica[]; items: ItemMetrica[]; pagos: PagoMetrica[]; gastos: GastoMetrica[] };
export type GrupoImporte = { id: string; nombre: string; importe: number; cantidad: number };

export function fechaNegocio(fecha: Date | string = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_METRICAS, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(fecha));
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function desplazarFecha(fecha: string, dias: number) {
  const date = new Date(`${fecha}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

export function validarRango(rango: RangoMetricas): string | null {
  for (const fecha of [rango.desde, rango.hasta]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) || new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha) {
      return "Ingresá fechas válidas.";
    }
  }
  if (rango.desde > rango.hasta) return "La fecha inicial debe ser anterior o igual a la final.";
  if ((Date.parse(rango.hasta) - Date.parse(rango.desde)) / 86400000 > 365) return "Seleccioná un período de hasta 366 días.";
  return null;
}

export function limitesRango(rango: RangoMetricas) {
  const error = validarRango(rango);
  if (error) throw new Error(error);
  return { inicio: `${rango.desde}T00:00:00-03:00`, fin: `${desplazarFecha(rango.hasta, 1)}T00:00:00-03:00` };
}

function redondear(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }

export function resumirMetricas(datos: DatosMetricas, rango: RangoMetricas, agrupacion: "dia" | "mes") {
  const error = validarRango(rango);
  if (error) throw new Error(error);
  const ventas = datos.ventas.filter((venta) => venta.estado === "cerrado" && fechaNegocio(venta.fecha) >= rango.desde && fechaNegocio(venta.fecha) <= rango.hasta);
  const pedidos = new Set(ventas.map((venta) => venta.id));
  const periodos = new Map<string, { fecha: string; importe: number; cantidad: number }>();
  for (let fecha = rango.desde; fecha <= rango.hasta; fecha = desplazarFecha(fecha, 1)) {
    const key = agrupacion === "mes" ? fecha.slice(0, 7) : fecha;
    if (!periodos.has(key)) periodos.set(key, { fecha: key, importe: 0, cantidad: 0 });
  }
  for (const venta of ventas) {
    const key = fechaNegocio(venta.fecha).slice(0, agrupacion === "mes" ? 7 : 10);
    const periodo = periodos.get(key)!;
    periodo.importe += venta.total;
    periodo.cantidad++;
  }
  const productos = new Map<string, GrupoImporte>();
  for (const item of datos.items) {
    // Los descuentos se guardan como renglones negativos, no son productos vendidos.
    if (!pedidos.has(item.pedidoId) || item.cantidad <= 0 || item.subtotal < 0) continue;
    const key = item.productoId ?? `nombre:${item.nombre.trim().toLocaleLowerCase("es-AR")}`;
    const grupo = productos.get(key) ?? { id: key, nombre: item.nombre, importe: 0, cantidad: 0 };
    grupo.cantidad += item.cantidad;
    grupo.importe += item.subtotal;
    productos.set(key, grupo);
  }
  const medios = new Map<string, GrupoImporte>();
  for (const pago of datos.pagos) {
    const grupo = medios.get(pago.medioId) ?? { id: pago.medioId, nombre: pago.nombre, importe: 0, cantidad: 0 };
    grupo.importe += pago.monto;
    grupo.cantidad++;
    medios.set(pago.medioId, grupo);
  }
  const categorias = new Map<string, GrupoImporte>();
  for (const gasto of datos.gastos) {
    const nombre = gasto.categoria.trim() || "Sin categoría";
    const key = nombre.toLocaleLowerCase("es-AR");
    const grupo = categorias.get(key) ?? { id: key, nombre, importe: 0, cantidad: 0 };
    grupo.importe += gasto.importe;
    grupo.cantidad++;
    categorias.set(key, grupo);
  }
  const totalVentas = redondear(ventas.reduce((total, venta) => total + venta.total, 0));
  const preparar = (valores: Iterable<GrupoImporte>) => [...valores].map((grupo) => ({ ...grupo, importe: redondear(grupo.importe) }));
  return {
    totalVentas,
    cantidadVentas: ventas.length,
    ticketPromedio: ventas.length ? redondear(totalVentas / ventas.length) : 0,
    totalCobros: redondear(datos.pagos.reduce((total, pago) => total + pago.monto, 0)),
    totalGastos: redondear(datos.gastos.reduce((total, gasto) => total + gasto.importe, 0)),
    cantidadGastos: datos.gastos.length,
    periodos: [...periodos.values()].map((periodo) => ({ ...periodo, importe: redondear(periodo.importe) })),
    productos: preparar(productos.values()).sort((a, b) => b.cantidad - a.cantidad || b.importe - a.importe || a.nombre.localeCompare(b.nombre)),
    medios: preparar(medios.values()).sort((a, b) => b.importe - a.importe),
    categorias: preparar(categorias.values()).sort((a, b) => b.importe - a.importe),
  };
}

export type MetricasAgregadas = Omit<ReturnType<typeof resumirMetricas>, "periodos" | "ticketPromedio"> & { dias: {fecha:string; importe:number; cantidad:number}[] };
export function agruparMetricas(datos: MetricasAgregadas, rango: RangoMetricas, agrupacion: "dia" | "mes") {
  const error = validarRango(rango);
  if (error) throw new Error(error);
  const periodos = new Map<string, {fecha:string; importe:number; cantidad:number}>();
  for (let fecha=rango.desde; fecha<=rango.hasta; fecha=desplazarFecha(fecha,1)) {
    const key=fecha.slice(0,agrupacion === "mes" ? 7 : 10);
    if (!periodos.has(key)) periodos.set(key,{fecha:key,importe:0,cantidad:0});
  }
  for (const dia of datos.dias) {
    const periodo=periodos.get(dia.fecha.slice(0,agrupacion === "mes" ? 7 : 10));
    if (periodo) { periodo.importe+=Number(dia.importe); periodo.cantidad+=Number(dia.cantidad); }
  }
  return {...datos, ticketPromedio:datos.cantidadVentas ? redondear(datos.totalVentas/datos.cantidadVentas):0,
    periodos:[...periodos.values()].map(p=>({...p,importe:redondear(p.importe)}))};
}
