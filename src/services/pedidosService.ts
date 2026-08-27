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
  comentario?: string | null;
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
    comentario: row.comentario ?? undefined,
  };
}

async function recalcularTotalPedido(pedidoId: string): Promise<number> {
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

  return total;
}

async function obtenerArqueoAbiertoParaVenta() {
  const { data, error } = await supabase
    .from("arqueos_caja")
    .select("id")
    .eq("estado", "abierto");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("No hay un arqueo de caja abierto. Abri un arqueo antes de cerrar ventas.");
  }

  if (data.length > 1) {
    throw new Error("Hay mas de un arqueo abierto. Cierra o selecciona una caja antes de vender.");
  }

  return data[0].id as string;
}

function horaEnTurno(hora: string, inicio: string, fin: string) {
  const horaNormalizada = hora.slice(0, 5);
  const inicioNormalizado = inicio.slice(0, 5);
  const finNormalizado = fin.slice(0, 5);

  if (inicioNormalizado < finNormalizado) {
    return horaNormalizada >= inicioNormalizado && horaNormalizada < finNormalizado;
  }

  return horaNormalizada >= inicioNormalizado || horaNormalizada < finNormalizado;
}

async function obtenerTurnoParaFecha(fecha: Date): Promise<string | null> {
  const hora = fecha.toTimeString().slice(0, 5);
  const { data, error } = await supabase
    .from("turnos")
    .select("id, hora_inicio, hora_fin")
    .eq("activo", true);

  if (error) {
    throw new Error(error.message);
  }

  const turno = (data ?? []).find((item) =>
    horaEnTurno(hora, String(item.hora_inicio), String(item.hora_fin))
  );

  return turno?.id ?? null;
}

async function recalcularTotalArqueo(arqueoCajaId: string) {
  const { data: pagos, error } = await supabase
    .from("pedido_pagos")
    .select("monto")
    .eq("arqueo_caja_id", arqueoCajaId)
    .not("arqueo_caja_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const totalVentas = (pagos ?? []).reduce((acc, pago) => acc + Number(pago.monto), 0);
  const { error: updateError } = await supabase
    .from("arqueos_caja")
    .update({ total_ventas: totalVentas, updated_at: new Date().toISOString() })
    .eq("id", arqueoCajaId);

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

export async function actualizarPersonasPedido(
  pedidoId: string,
  personas: number
): Promise<Pedido> {
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      personas,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("estado", "abierto")
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPedido(data);
}

export async function moverPedidoAMesa(
  pedidoId: string,
  mesaDestinoId: string
): Promise<Pedido> {
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      tipo: "mesa",
      mesa_id: mesaDestinoId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("estado", "abierto")
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPedido(data);
}

export async function juntarPedidosMesa(
  pedidoOrigenId: string,
  pedidoDestinoId: string
): Promise<Pedido> {
  const updatedAt = new Date().toISOString();

  const { error: itemsError } = await supabase
    .from("pedido_items")
    .update({ pedido_id: pedidoDestinoId, updated_at: updatedAt })
    .eq("pedido_id", pedidoOrigenId);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { error: pagosError } = await supabase
    .from("pedido_pagos")
    .update({ pedido_id: pedidoDestinoId })
    .eq("pedido_id", pedidoOrigenId);

  if (pagosError) {
    throw new Error(pagosError.message);
  }

  const { error: cobrosItemsError } = await supabase
    .from("pedido_item_cobros")
    .update({ pedido_id: pedidoDestinoId })
    .eq("pedido_id", pedidoOrigenId);

  if (cobrosItemsError) {
    throw new Error(cobrosItemsError.message);
  }

  const totalDestino = await recalcularTotalPedido(pedidoDestinoId);

  const { error: origenError } = await supabase
    .from("pedidos")
    .update({
      estado: "cancelado",
      total: 0,
      updated_at: updatedAt,
    })
    .eq("id", pedidoOrigenId)
    .eq("estado", "abierto");

  if (origenError) {
    throw new Error(origenError.message);
  }

  const { data, error } = await supabase
    .from("pedidos")
    .select("id, tipo, mesa_id, estado, personas, cliente, total, created_at")
    .eq("id", pedidoDestinoId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPedido({ ...data, total: totalDestino });
}

export async function obtenerItemsPedido(pedidoId: string): Promise<PedidoItem[]> {
  const { data, error } = await supabase
    .from("pedido_items")
    .select("id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal, comentario")
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
  comentario?: string;
};

export type PagoPedidoInput = {
  medioPagoId: string;
  monto: number;
};

export type ItemCobroParcialInput = {
  pedidoItemId: string;
  cantidad: number;
  monto: number;
};

export type DescuentoPedidoInput = {
  tipo: "monto" | "porcentaje";
  valor: number;
};

export type PagoPedido = PagoPedidoInput & {
  id: string;
};

async function obtenerPagosPedidoRaw(pedidoId: string): Promise<PagoPedido[]> {
  const { data, error } = await supabase
    .from("pedido_pagos")
    .select("id, medio_pago_id, monto")
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((pago) => ({
    id: String(pago.id),
    medioPagoId: String(pago.medio_pago_id),
    monto: Number(pago.monto),
  }));
}

export async function obtenerTotalPagadoPedido(pedidoId: string): Promise<number> {
  const pagos = await obtenerPagosPedidoRaw(pedidoId);
  return pagos.reduce((acc, pago) => acc + pago.monto, 0);
}

export async function obtenerCantidadesCobradasItems(
  pedidoId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("pedido_item_cobros")
    .select("pedido_item_id, cantidad")
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<Record<string, number>>((acc, item) => {
    const itemId = String(item.pedido_item_id);
    acc[itemId] = (acc[itemId] ?? 0) + Number(item.cantidad);
    return acc;
  }, {});
}

function validarPagosPedido(pagos: PagoPedidoInput[]) {
  if (pagos.length === 0) {
    throw new Error("Agrega al menos un pago.");
  }

  if (pagos.some((pago) => !pago.medioPagoId || !Number.isFinite(pago.monto) || pago.monto <= 0)) {
    throw new Error("Revisa los medios de pago y montos.");
  }
}

async function obtenerArqueoPedidoParaPago(pedidoId: string) {
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("arqueo_caja_id")
    .eq("id", pedidoId)
    .single();

  if (pedidoError) {
    throw new Error(pedidoError.message);
  }

  const arqueoCajaId = await obtenerArqueoAbiertoParaVenta();

  const { data: arqueo, error: arqueoError } = await supabase
    .from("arqueos_caja")
    .select("estado")
    .eq("id", arqueoCajaId)
    .single();

  if (arqueoError) {
    throw new Error(arqueoError.message);
  }

  if (arqueo.estado !== "abierto") {
    throw new Error("No se pueden registrar pagos en un arqueo cerrado.");
  }

  if (!pedido.arqueo_caja_id) {
    const { error: updateError } = await supabase
      .from("pedidos")
      .update({ arqueo_caja_id: arqueoCajaId, updated_at: new Date().toISOString() })
      .eq("id", pedidoId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return arqueoCajaId;
}

async function insertarPagosPedido(
  pedidoId: string,
  pagos: PagoPedidoInput[],
  arqueoCajaId: string
) {
  const { error: pagosError } = await supabase.from("pedido_pagos").insert(
    pagos.map((pago) => ({
      pedido_id: pedidoId,
      medio_pago_id: pago.medioPagoId,
      arqueo_caja_id: arqueoCajaId,
      monto: pago.monto,
    }))
  );

  if (pagosError) {
    throw new Error(pagosError.message);
  }
}

async function validarItemsCobroParcial(
  pedidoId: string,
  itemsCobrados: ItemCobroParcialInput[],
  totalPago: number
) {
  if (itemsCobrados.length === 0) {
    throw new Error("Selecciona al menos un producto para cobrar.");
  }

  if (
    itemsCobrados.some(
      (item) => !item.pedidoItemId || !Number.isFinite(item.cantidad) || item.cantidad <= 0
    )
  ) {
    throw new Error("Revisa los productos seleccionados para cobrar.");
  }

  const ids = itemsCobrados.map((item) => item.pedidoItemId);
  const { data: items, error } = await supabase
    .from("pedido_items")
    .select("id, cantidad, subtotal")
    .eq("pedido_id", pedidoId)
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  if (!items || items.length !== ids.length) {
    throw new Error("Algunos productos seleccionados ya no existen en el pedido.");
  }

  const cantidadesCobradas = await obtenerCantidadesCobradasItems(pedidoId);
  const totalItems = itemsCobrados.reduce((acc, itemCobrado) => {
    const item = items.find((pedidoItem) => pedidoItem.id === itemCobrado.pedidoItemId);

    if (!item) {
      throw new Error("Algunos productos seleccionados ya no existen en el pedido.");
    }

    const cantidadItem = Number(item.cantidad);
    const cantidadYaCobrada = cantidadesCobradas[itemCobrado.pedidoItemId] ?? 0;
    const disponible = cantidadItem - cantidadYaCobrada;

    if (itemCobrado.cantidad > disponible) {
      throw new Error("Uno de los productos seleccionados ya fue cobrado parcial o totalmente.");
    }

    return acc + itemCobrado.monto;
  }, 0);

  if (Math.abs(totalItems - totalPago) > 0.01) {
    throw new Error("La suma de los cobros debe coincidir con los productos seleccionados.");
  }
}

async function insertarCobrosItemsPedido(
  pedidoId: string,
  itemsCobrados: ItemCobroParcialInput[]
) {
  if (itemsCobrados.length === 0) return;

  const { error } = await supabase.from("pedido_item_cobros").insert(
    itemsCobrados.map((item) => ({
      pedido_id: pedidoId,
      pedido_item_id: item.pedidoItemId,
      cantidad: item.cantidad,
      monto: item.monto,
    }))
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function registrarPagoParcialPedido(
  pedidoId: string,
  pagos: PagoPedidoInput[],
  itemsCobrados: ItemCobroParcialInput[] = []
): Promise<number> {
  validarPagosPedido(pagos);
  const total = await recalcularTotalPedido(pedidoId);
  const pagadoActual = await obtenerTotalPagadoPedido(pedidoId);
  const totalNuevo = pagos.reduce((acc, pago) => acc + pago.monto, 0);

  if (pagadoActual + totalNuevo >= total - 0.01) {
    throw new Error("Para cobrar el total usa Cerrar venta.");
  }

  if (itemsCobrados.length > 0) {
    await validarItemsCobroParcial(pedidoId, itemsCobrados, totalNuevo);
  }

  const arqueoCajaId = await obtenerArqueoPedidoParaPago(pedidoId);
  await insertarPagosPedido(pedidoId, pagos, arqueoCajaId);
  await insertarCobrosItemsPedido(pedidoId, itemsCobrados);
  await recalcularTotalArqueo(arqueoCajaId);

  return pagadoActual + totalNuevo;
}

export async function confirmarProductosPedido(
  pedidoId: string,
  productos: ProductoPendientePedido[]
): Promise<PedidoItem[]> {
  for (const producto of productos) {
    const comentario = producto.comentario?.trim() || null;
    let itemExistenteQuery = supabase
      .from("pedido_items")
      .select("id, cantidad")
      .eq("pedido_id", pedidoId)
      .eq("producto_id", producto.productoId)
      .eq("precio_unitario", producto.precioUnitario);

    itemExistenteQuery = comentario
      ? itemExistenteQuery.eq("comentario", comentario)
      : itemExistenteQuery.is("comentario", null);

    const { data: itemExistente, error: itemError } = await itemExistenteQuery.maybeSingle();

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
          comentario,
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
        comentario,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  await recalcularTotalPedido(pedidoId);
  return obtenerItemsPedido(pedidoId);
}

export async function aplicarDescuentoPedido(
  pedidoId: string,
  descuento: DescuentoPedidoInput
): Promise<PedidoItem[]> {
  if (!Number.isFinite(descuento.valor) || descuento.valor <= 0) {
    throw new Error("El descuento debe ser mayor a cero.");
  }

  const items = await obtenerItemsPedido(pedidoId);
  const subtotal = items
    .filter((item) => item.subtotal > 0)
    .reduce((acc, item) => acc + item.subtotal, 0);

  if (subtotal <= 0) {
    throw new Error("Agrega productos antes de aplicar un descuento.");
  }

  const montoDescuento =
    descuento.tipo === "porcentaje" ? subtotal * (descuento.valor / 100) : descuento.valor;
  const montoNormalizado = Math.min(subtotal, Math.round(montoDescuento * 100) / 100);

  if (montoNormalizado <= 0) {
    throw new Error("El descuento debe ser mayor a cero.");
  }

  const detalle =
    descuento.tipo === "porcentaje"
      ? `${descuento.valor}% sobre $${subtotal.toLocaleString()}`
      : `Monto fijo`;
  const itemDescuento = items.find(
    (item) => !item.productoId && item.nombreProducto === "Descuento"
  );

  if (itemDescuento) {
    const { error } = await supabase
      .from("pedido_items")
      .update({
        precio_unitario: -montoNormalizado,
        cantidad: 1,
        subtotal: -montoNormalizado,
        comentario: detalle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemDescuento.id)
      .eq("pedido_id", pedidoId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("pedido_items").insert({
      pedido_id: pedidoId,
      producto_id: null,
      nombre_producto: "Descuento",
      precio_unitario: -montoNormalizado,
      cantidad: 1,
      subtotal: -montoNormalizado,
      comentario: detalle,
    });

    if (error) {
      throw new Error(error.message);
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
  const cantidadesCobradas = await obtenerCantidadesCobradasItems(pedidoId);
  const cantidadCobrada = cantidadesCobradas[item.id] ?? 0;

  if (cantidadNormalizada < cantidadCobrada) {
    throw new Error("No se puede bajar la cantidad por debajo de lo ya cobrado.");
  }

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
  const cantidadesCobradas = await obtenerCantidadesCobradasItems(pedidoId);

  if ((cantidadesCobradas[itemId] ?? 0) > 0) {
    throw new Error("No se puede eliminar un producto que ya fue cobrado.");
  }

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
  const total = await recalcularTotalPedido(pedidoId);
  const arqueoCajaId = await obtenerArqueoPedidoParaPago(pedidoId);
  const closedAt = new Date();
  const turnoId = await obtenerTurnoParaFecha(closedAt);
  const pagadoActual = await obtenerTotalPagadoPedido(pedidoId);
  const totalPagosNuevos = pagos.reduce((acc, pago) => acc + pago.monto, 0);
  const totalPagos = pagadoActual + totalPagosNuevos;

  validarPagosPedido(pagos);

  if (Math.abs(totalPagos - total) > 0.01) {
    throw new Error("Los pagos deben coincidir con el total de la venta.");
  }

  await insertarPagosPedido(pedidoId, pagos, arqueoCajaId);

  const { error } = await supabase
    .from("pedidos")
    .update({
      estado: "cerrado",
      arqueo_caja_id: arqueoCajaId,
      turno_id: turnoId,
      closed_at: closedAt.toISOString(),
      updated_at: closedAt.toISOString(),
    })
    .eq("id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }

  await recalcularTotalArqueo(arqueoCajaId);
}
