import type { Pedido, PedidoItem, Producto } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type PedidoRow = {
  id: string;
  tipo: "mesa" | "mostrador";
  mesa_id: string | null;
  estado: "abierto" | "cerrado" | "cancelado";
  personas: number;
  cliente: string | null;
  total: number;
  created_at: string;
};

type PedidoItemRow = {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
};

function mapPedido(row: PedidoRow): Pedido {
  return {
    id: row.id,
    tipo: row.tipo,
    mesaId: row.mesa_id ?? undefined,
    estado: row.estado,
    personas: row.personas,
    cliente: row.cliente ?? undefined,
    total: Number(row.total),
    horaInicio: row.created_at,
  };
}

function mapPedidoItem(row: PedidoItemRow): PedidoItem {
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    productoId: row.producto_id ?? undefined,
    nombreProducto: row.nombre_producto,
    precioUnitario: Number(row.precio_unitario),
    cantidad: row.cantidad,
    subtotal: Number(row.subtotal),
  };
}

async function recalcularTotalPedido(pedidoId: string) {
  const { data, error } = await supabase
    .from("pedido_items")
    .select("subtotal")
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }

  const total = (data ?? []).reduce((acc, item) => acc + Number(item.subtotal), 0);
  const { error: updateError } = await supabase
    .from("pedidos")
    .update({ total, updated_at: new Date().toISOString() })
    .eq("id", pedidoId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function obtenerPedidoAbiertoPorMesa(mesaId: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .eq("mesa_id", mesaId)
    .eq("tipo", "mesa")
    .eq("estado", "abierto")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPedido(data) : null;
}

export async function crearPedidoMesa(mesaId: string, personas: number): Promise<Pedido> {
  const existente = await obtenerPedidoAbiertoPorMesa(mesaId);
  if (existente) {
    return existente;
  }

  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      tipo: "mesa",
      mesa_id: mesaId,
      estado: "abierto",
      personas,
      total: 0,
    })
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existenteLuegoDelConflicto = await obtenerPedidoAbiertoPorMesa(mesaId);

      if (existenteLuegoDelConflicto) {
        return existenteLuegoDelConflicto;
      }
    }

    throw new Error(error.message);
  }

  return mapPedido(data);
}

export async function obtenerPedidosMostradorAbiertos(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .eq("tipo", "mostrador")
    .eq("estado", "abierto")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPedido);
}

export async function crearPedidoMostrador(cliente?: string): Promise<Pedido> {
  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      tipo: "mostrador",
      estado: "abierto",
      cliente: cliente?.trim() || null,
      personas: 0,
      total: 0,
    })
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPedido(data);
}

export async function actualizarClientePedido(
  pedidoId: string,
  cliente: string
): Promise<Pedido> {
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      cliente: cliente.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPedido(data);
}

export async function obtenerItemsPedido(pedidoId: string): Promise<PedidoItem[]> {
  const { data, error } = await supabase
    .from("pedido_items")
    .select("id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal")
    .eq("pedido_id", pedidoId)
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPedidoItem);
}

export async function agregarProductoAPedido(
  pedidoId: string,
  producto: Producto
): Promise<PedidoItem[]> {
  return confirmarProductosPedido(pedidoId, [
    {
      productoId: producto.id,
      nombreProducto: producto.nombre,
      precioUnitario: producto.precio,
      cantidad: 1,
    },
  ]);
}

export type ProductoPendientePedido = {
  productoId: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
};

export type PagoPedidoInput = {
  medioPagoId: string;
  monto: number;
};

export async function confirmarProductosPedido(
  pedidoId: string,
  productos: ProductoPendientePedido[]
): Promise<PedidoItem[]> {
  for (const producto of productos) {
    const { data: itemExistente, error: itemError } = await supabase
      .from("pedido_items")
      .select("id, cantidad")
      .eq("pedido_id", pedidoId)
      .eq("producto_id", producto.productoId)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (itemExistente) {
      const nuevaCantidad = Number(itemExistente.cantidad) + producto.cantidad;
      const { error } = await supabase
        .from("pedido_items")
        .update({
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * producto.precioUnitario,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemExistente.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("pedido_items").insert({
        pedido_id: pedidoId,
        producto_id: producto.productoId,
        nombre_producto: producto.nombreProducto,
        precio_unitario: producto.precioUnitario,
        cantidad: producto.cantidad,
        subtotal: producto.precioUnitario * producto.cantidad,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  await recalcularTotalPedido(pedidoId);
  return obtenerItemsPedido(pedidoId);
}

export async function actualizarCantidadItemPedido(
  pedidoId: string,
  item: PedidoItem,
  cantidad: number
): Promise<PedidoItem[]> {
  const cantidadNormalizada = Math.max(1, Math.floor(cantidad));
  const { error } = await supabase
    .from("pedido_items")
    .update({
      cantidad: cantidadNormalizada,
      subtotal: cantidadNormalizada * item.precioUnitario,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }

  await recalcularTotalPedido(pedidoId);
  return obtenerItemsPedido(pedidoId);
}

export async function eliminarItemPedido(
  pedidoId: string,
  itemId: string
): Promise<PedidoItem[]> {
  const { error } = await supabase
    .from("pedido_items")
    .delete()
    .eq("id", itemId)
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }

  await recalcularTotalPedido(pedidoId);
  return obtenerItemsPedido(pedidoId);
}

export async function cerrarPedido(pedidoId: string, pagos: PagoPedidoInput[] = []): Promise<void> {
  await recalcularTotalPedido(pedidoId);

  if (pagos.length > 0) {
    const { error: pagosError } = await supabase.from("pedido_pagos").insert(
      pagos.map((pago) => ({
        pedido_id: pedidoId,
        medio_pago_id: pago.medioPagoId,
        monto: pago.monto,
      }))
    );

    if (pagosError) {
      throw new Error(pagosError.message);
    }
  }

  const { error } = await supabase
    .from("pedidos")
    .update({
      estado: "cerrado",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }
}
