import type { PedidoItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export type EstadoVentaFiltro = "todos" | "abierto" | "cerrado" | "cancelado";
export type TipoVentaFiltro = "todos" | "mesa" | "mostrador";

export type VentaPago = {
  id: string;
  medioPagoNombre: string;
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
        "pedido_pagos(id, medio_pago_id, monto, medios_pago(nombre))",
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
