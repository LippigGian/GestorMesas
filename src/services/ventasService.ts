import type { PedidoItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export type EstadoVentaFiltro = "todos" | "abierto" | "cerrado" | "cancelado";
export type TipoVentaFiltro = "todos" | "mesa" | "mostrador";

export type VentaPago = {
  id: string;
  medioPagoId: string;
  arqueoCajaId?: string;
  medioPagoNombre: string;
  monto: number;
};

export type VentaPagoInput = {
  medioPagoId: string;
  monto: number;
};

export type VentaResumen = {
  id: string;
  tipo: "mesa" | "mostrador";
  estado: "abierto" | "cerrado" | "cancelado";
  horaInicio: string;
  horaCierre?: string;
  mesaId?: string;
  mesaNumero?: string;
  cliente?: string;
  personas: number;
  total: number;
  turnoId?: string;
  turnoNombre?: string;
  arqueoCajaId?: string;
  pagos: VentaPago[];
  items: PedidoItem[];
};

export type ObtenerVentasFiltros = {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: EstadoVentaFiltro;
  tipo?: TipoVentaFiltro;
  turnoId?: string;
  medioPagoId?: string;
  mesaId?: string;
};

type VentaRow = {
  id: string;
  tipo: "mesa" | "mostrador";
  mesa_id: string | null;
  estado: "abierto" | "cerrado" | "cancelado";
  personas: number | null;
  cliente: string | null;
  total: number;
  created_at: string;
  closed_at: string | null;
  turno_id: string | null;
  arqueo_caja_id: string | null;
  mesas?: { numero: string } | { numero: string }[] | null;
  turnos?: { nombre: string } | { nombre: string }[] | null;
  pedido_pagos?: Array<{
    id: string;
    medio_pago_id: string;
    arqueo_caja_id: string | null;
    monto: number;
    medios_pago?: { nombre: string } | { nombre: string }[] | null;
  }> | null;
  pedido_items?: Array<{
    id: string;
    pedido_id: string;
    producto_id: string | null;
    nombre_producto: string;
    precio_unitario: number;
    cantidad: number;
    subtotal: number;
  }> | null;
};

function obtenerRelacion<T>(relacion: T | T[] | null | undefined): T | undefined {
  return Array.isArray(relacion) ? relacion[0] : relacion ?? undefined;
}

function mapVenta(row: VentaRow): VentaResumen {
  const mesa = obtenerRelacion(row.mesas);
  const turno = obtenerRelacion(row.turnos);

  return {
    id: row.id,
    tipo: row.tipo,
    estado: row.estado,
    horaInicio: row.created_at,
    horaCierre: row.closed_at ?? undefined,
    mesaId: row.mesa_id ?? undefined,
    mesaNumero: mesa?.numero,
    cliente: row.cliente ?? undefined,
    personas: row.personas ?? 0,
    total: Number(row.total),
    turnoId: row.turno_id ?? undefined,
    turnoNombre: turno?.nombre,
    arqueoCajaId: row.arqueo_caja_id ?? undefined,
    pagos: (row.pedido_pagos ?? []).map((pago) => {
      const medio = obtenerRelacion(pago.medios_pago);

      return {
        id: pago.id,
        medioPagoId: pago.medio_pago_id,
        arqueoCajaId: pago.arqueo_caja_id ?? undefined,
        medioPagoNombre: medio?.nombre ?? "Sin medio",
        monto: Number(pago.monto),
      };
    }),
    items: (row.pedido_items ?? []).map((item) => ({
      id: item.id,
      pedidoId: item.pedido_id,
      productoId: item.producto_id ?? undefined,
      nombreProducto: item.nombre_producto,
      precioUnitario: Number(item.precio_unitario),
      cantidad: item.cantidad,
      subtotal: Number(item.subtotal),
    })),
  };
}

function fechaHastaExclusiva(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export async function obtenerVentas(filtros: ObtenerVentasFiltros): Promise<VentaResumen[]> {
  let query = supabase
    .from("pedidos")
    .select(
      [
        "id",
        "tipo",
        "mesa_id",
        "estado",
        "personas",
        "cliente",
        "total",
        "created_at",
        "closed_at",
        "turno_id",
        "arqueo_caja_id",
        "mesas(numero)",
        "turnos(nombre)",
        "pedido_pagos(id, medio_pago_id, arqueo_caja_id, monto, medios_pago(nombre))",
        "pedido_items(id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (filtros.fechaDesde) {
    query = query.gte("created_at", new Date(`${filtros.fechaDesde}T00:00:00`).toISOString());
  }

  if (filtros.fechaHasta) {
    query = query.lt("created_at", fechaHastaExclusiva(filtros.fechaHasta));
  }

  if (filtros.estado && filtros.estado !== "todos") {
    query = query.eq("estado", filtros.estado);
  }

  if (filtros.tipo && filtros.tipo !== "todos") {
    query = query.eq("tipo", filtros.tipo);
  }

  if (filtros.turnoId) {
    query = query.eq("turno_id", filtros.turnoId);
  }

  if (filtros.mesaId) {
    query = query.eq("mesa_id", filtros.mesaId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []) as unknown as VentaRow[];

  if (!filtros.medioPagoId) {
    return rows.map(mapVenta);
  }

  rows = rows.filter((venta) =>
    (venta.pedido_pagos ?? []).some((pago) => pago.medio_pago_id === filtros.medioPagoId)
  );

  return rows.map(mapVenta);
}

export async function obtenerVentaPorId(ventaId: string): Promise<VentaResumen> {
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      [
        "id",
        "tipo",
        "mesa_id",
        "estado",
        "personas",
        "cliente",
        "total",
        "created_at",
        "closed_at",
        "turno_id",
        "arqueo_caja_id",
        "mesas(numero)",
        "turnos(nombre)",
        "pedido_pagos(id, medio_pago_id, arqueo_caja_id, monto, medios_pago(nombre))",
        "pedido_items(id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)",
      ].join(", ")
    )
    .eq("id", ventaId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenta(data as unknown as VentaRow);
}

export async function actualizarPagosVenta(
  ventaId: string,
  pagos: VentaPagoInput[]
): Promise<VentaResumen> {
  const { data: venta, error: ventaError } = await supabase
    .from("pedidos")
    .select("id, estado, total")
    .eq("id", ventaId)
    .single();

  if (ventaError) {
    throw new Error(ventaError.message);
  }

  if (venta.estado !== "cerrado") {
    throw new Error("Solo se pueden editar pagos de ventas cerradas.");
  }

  const { data: pagosActuales, error: pagosActualesError } = await supabase
    .from("pedido_pagos")
    .select("id, arqueo_caja_id")
    .eq("pedido_id", ventaId);

  if (pagosActualesError) {
    throw new Error(pagosActualesError.message);
  }

  const arqueoCajaIds = Array.from(
    new Set((pagosActuales ?? []).map((pago) => pago.arqueo_caja_id).filter(Boolean))
  );

  if (arqueoCajaIds.length !== 1) {
    throw new Error("Esta venta tiene pagos en mas de un arqueo. Editala desde ajustes avanzados.");
  }

  const arqueoCajaId = String(arqueoCajaIds[0]);

  const { data: arqueo, error: arqueoError } = await supabase
    .from("arqueos_caja")
    .select("estado")
    .eq("id", arqueoCajaId)
    .single();

  if (arqueoError) {
    throw new Error(arqueoError.message);
  }

  if (arqueo.estado !== "abierto") {
    throw new Error("No se pueden editar pagos de una venta con arqueo cerrado.");
  }

  const total = Number(venta.total);
  const totalPagos = pagos.reduce((acc, pago) => acc + pago.monto, 0);

  if (pagos.length === 0) {
    throw new Error("La venta debe tener al menos un pago.");
  }

  if (pagos.some((pago) => !pago.medioPagoId || !Number.isFinite(pago.monto) || pago.monto <= 0)) {
    throw new Error("Revisa los medios de pago y montos.");
  }

  if (Math.abs(totalPagos - total) > 0.01) {
    throw new Error("La suma de los pagos debe coincidir con el total de la venta.");
  }

  const { error: deleteError } = await supabase
    .from("pedido_pagos")
    .delete()
    .eq("pedido_id", ventaId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: insertError } = await supabase.from("pedido_pagos").insert(
    pagos.map((pago) => ({
      pedido_id: ventaId,
      medio_pago_id: pago.medioPagoId,
      arqueo_caja_id: arqueoCajaId,
      monto: pago.monto,
    }))
  );

  if (insertError) {
    throw new Error(insertError.message);
  }

  return obtenerVentaPorId(ventaId);
}
