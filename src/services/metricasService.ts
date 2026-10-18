import { supabase } from "@/lib/supabase";
import { limitesRango, type DatosMetricas, type RangoMetricas } from "@/lib/metricas";

// Paginar evita que el límite de filas de PostgREST recorte silenciosamente los totales.
export async function leerPaginas<T>(consultar: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const filas: T[] = [];
  const tamaño = 500;
  for (let offset = 0; ; offset += tamaño) {
    const { data, error } = await consultar(offset, offset + tamaño - 1);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < tamaño) return filas;
  }
}

export async function obtenerMetricas(rango: RangoMetricas, signal: AbortSignal, localId: string): Promise<DatosMetricas> {
  if (!localId) throw new Error("No hay un local activo configurado.");
  const { inicio, fin } = limitesRango(rango);
  const [ventas, pagos, gastos] = await Promise.all([
    leerPaginas((desde, hasta) => supabase.from("pedidos").select("id, estado, closed_at, total")
      .eq("local_id", localId).eq("estado", "cerrado").gte("closed_at", inicio).lt("closed_at", fin).order("id").range(desde, hasta).abortSignal(signal)),
    leerPaginas((desde, hasta) => supabase.from("pedido_pagos").select("id, medio_pago_id, monto, medios_pago(nombre)")
      .eq("local_id", localId).gte("created_at", inicio).lt("created_at", fin).order("id").range(desde, hasta).abortSignal(signal)),
    leerPaginas((desde, hasta) => supabase.from("gastos").select("id, categoria, importe")
      .eq("local_id", localId).gte("fecha", inicio).lt("fecha", fin).order("id").range(desde, hasta).abortSignal(signal)),
  ]);
  const items: DatosMetricas["items"] = [];
  // Consultar por grupos de pedidos evita URLs excesivas y límites en relaciones anidadas.
  for (let offset = 0; offset < ventas.length; offset += 100) {
    const ids = ventas.slice(offset, offset + 100).map((venta) => venta.id);
    const filas = await leerPaginas((desde, hasta) => supabase.from("pedido_items")
      .select("id, pedido_id, producto_id, nombre_producto, cantidad, subtotal")
      .eq("local_id", localId).in("pedido_id", ids).order("id").range(desde, hasta).abortSignal(signal));
    items.push(...filas.map((item) => ({ pedidoId: item.pedido_id, productoId: item.producto_id,
      nombre: item.nombre_producto, cantidad: Number(item.cantidad), subtotal: Number(item.subtotal) })));
  }
  return {
    ventas: ventas.map((venta) => ({ id: venta.id, estado: venta.estado, fecha: venta.closed_at, total: Number(venta.total) })),
    items,
    pagos: pagos.map((pago) => {
      const relacion = pago.medios_pago;
      const medio = Array.isArray(relacion) ? relacion[0] : relacion;
      return { medioId: pago.medio_pago_id, nombre: medio?.nombre ?? "Medio no disponible", monto: Number(pago.monto) };
    }),
    gastos: gastos.map((gasto) => ({ categoria: gasto.categoria ?? "", importe: Number(gasto.importe) })),
  };
}
