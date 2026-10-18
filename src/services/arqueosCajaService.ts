import type { ArqueoCaja, ArqueoCajaMedioPago } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type ArqueoCajaRow = {
  id: string;
  local_id: string | null;
  caja_id: string;
  estado: "abierto" | "cerrado" | "cancelado";
  monto_inicial: number;
  monto_final_declarado: number | null;
  total_ventas: number;
  diferencia: number | null;
  opened_at: string | null;
  closed_at: string | null;
  cajas?: { nombre: string } | { nombre: string }[] | null;
};

type ArqueoCajaMedioPagoRow = {
  id: string;
  arqueo_caja_id: string;
  medio_pago_id: string;
  monto_sistema: number;
  monto_declarado: number;
  diferencia: number;
  medios_pago?: { nombre: string } | { nombre: string }[] | null;
};

function mapArqueo(row: ArqueoCajaRow): ArqueoCaja {
  const caja = Array.isArray(row.cajas) ? row.cajas[0] : row.cajas;

  return {
    id: row.id,
    localId: row.local_id ?? undefined,
    cajaId: row.caja_id,
    cajaNombre: caja?.nombre,
    estado: row.estado,
    montoInicial: Number(row.monto_inicial),
    montoFinalDeclarado:
      row.monto_final_declarado === null ? undefined : Number(row.monto_final_declarado),
    totalVentas: Number(row.total_ventas),
    diferencia: row.diferencia === null ? undefined : Number(row.diferencia),
    openedAt: row.opened_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
  };
}

const selectArqueo =
  "id, local_id, caja_id, estado, monto_inicial, monto_final_declarado, total_ventas, diferencia, opened_at, closed_at, cajas(nombre)";

function mapArqueoMedioPago(row: ArqueoCajaMedioPagoRow): ArqueoCajaMedioPago {
  const medio = Array.isArray(row.medios_pago) ? row.medios_pago[0] : row.medios_pago;

  return {
    id: row.id,
    arqueoCajaId: row.arqueo_caja_id,
    medioPagoId: row.medio_pago_id,
    medioPagoNombre: medio?.nombre,
    montoSistema: Number(row.monto_sistema),
    montoDeclarado: Number(row.monto_declarado),
    diferencia: Number(row.diferencia),
  };
}

export async function obtenerArqueosCaja(localId?: string): Promise<ArqueoCaja[]> {
  let query = supabase
    .from("arqueos_caja")
    .select(selectArqueo)
    .order("opened_at", { ascending: false });

  if (localId) {
    query = query.eq("local_id", localId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapArqueo(row as ArqueoCajaRow));
}

async function obtenerMontosSistemaPorMedio(arqueoId: string) {
  const montos = new Map<string, number>();

  const { data: pagos, error: pagosError } = await supabase
    .from("pedido_pagos")
    .select("medio_pago_id, monto")
    .eq("arqueo_caja_id", arqueoId);

  if (pagosError) {
    throw new Error(pagosError.message);
  }

  for (const pago of pagos ?? []) {
    const medioPagoId = String(pago.medio_pago_id);
    montos.set(medioPagoId, (montos.get(medioPagoId) ?? 0) + Number(pago.monto));
  }

  const { data: gastos, error: gastosError } = await supabase
    .from("gastos")
    .select("medio_pago_id, importe")
    .eq("arqueo_caja_id", arqueoId);

  if (gastosError) {
    throw new Error(gastosError.message);
  }

  for (const gasto of gastos ?? []) {
    const medioPagoId = String(gasto.medio_pago_id);
    montos.set(medioPagoId, (montos.get(medioPagoId) ?? 0) - Number(gasto.importe));
  }

  return montos;
}

export async function crearArqueoCaja(input: {
  localId: string;
  cajaId: string;
  montoInicial: number;
  openedAt: string;
}): Promise<ArqueoCaja> {
  if (!input.cajaId) {
    throw new Error("Selecciona una caja.");
  }

  if (!input.openedAt) {
    throw new Error("Selecciona la fecha y hora de apertura.");
  }

  const openedAt = new Date(input.openedAt);

  if (Number.isNaN(openedAt.getTime())) {
    throw new Error("La fecha y hora de apertura no es valida.");
  }

  const { data, error } = await supabase
    .from("arqueos_caja")
    .insert({
      local_id: input.localId,
      caja_id: input.cajaId,
      estado: "abierto",
      monto_inicial: input.montoInicial,
      opened_at: openedAt.toISOString(),
    })
    .select(selectArqueo)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un arqueo abierto para esa caja.");
    }

    throw new Error(error.message);
  }

  return mapArqueo(data as ArqueoCajaRow);
}

export async function cerrarArqueoCaja(input: {
  arqueoId: string;
  declaraciones: Array<{ medioPagoId: string; montoDeclarado: number }>;
}): Promise<ArqueoCaja> {
  const montosSistema = await obtenerMontosSistemaPorMedio(input.arqueoId);
  const totalSistema = Array.from(montosSistema.values()).reduce((acc, monto) => acc + monto, 0);
  const montoFinalDeclarado = input.declaraciones.reduce(
    (acc, declaracion) => acc + declaracion.montoDeclarado,
    0
  );
  const diferencia = montoFinalDeclarado - totalSistema;

  const registros = input.declaraciones.map((declaracion) => {
    const montoSistema = montosSistema.get(declaracion.medioPagoId) ?? 0;

    return {
      arqueo_caja_id: input.arqueoId,
      medio_pago_id: declaracion.medioPagoId,
      monto_sistema: montoSistema,
      monto_declarado: declaracion.montoDeclarado,
      diferencia: declaracion.montoDeclarado - montoSistema,
    };
  });

  const { error: deleteError } = await supabase
    .from("arqueo_caja_medios_pago")
    .delete()
    .eq("arqueo_caja_id", input.arqueoId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (registros.length > 0) {
    const { error: insertError } = await supabase
      .from("arqueo_caja_medios_pago")
      .insert(registros);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { data, error } = await supabase
    .from("arqueos_caja")
    .update({
      estado: "cerrado",
      monto_final_declarado: montoFinalDeclarado,
      diferencia,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.arqueoId)
    .select(selectArqueo)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapArqueo(data as ArqueoCajaRow);
}

export async function obtenerDetalleMediosPagoArqueo(
  arqueoId: string
): Promise<ArqueoCajaMedioPago[]> {
  const { data, error } = await supabase
    .from("arqueo_caja_medios_pago")
    .select(
      "id, arqueo_caja_id, medio_pago_id, monto_sistema, monto_declarado, diferencia, medios_pago(nombre)"
    )
    .eq("arqueo_caja_id", arqueoId)
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapArqueoMedioPago(row as ArqueoCajaMedioPagoRow));
}

export async function obtenerMontosSistemaMediosPagoArqueo(
  arqueoId: string,
  localId?: string
): Promise<ArqueoCajaMedioPago[]> {
  const montosSistema = await obtenerMontosSistemaPorMedio(arqueoId);
  let query = supabase
    .from("medios_pago")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  if (localId) {
    query = query.eq("local_id", localId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((medio) => {
    const montoSistema = montosSistema.get(String(medio.id)) ?? 0;

    return {
      arqueoCajaId: arqueoId,
      medioPagoId: String(medio.id),
      medioPagoNombre: String(medio.nombre),
      montoSistema,
      montoDeclarado: 0,
      diferencia: -montoSistema,
    };
  });
}
