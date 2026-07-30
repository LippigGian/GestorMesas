import type { ArqueoCaja } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type ArqueoCajaRow = {
  id: string;
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

function mapArqueo(row: ArqueoCajaRow): ArqueoCaja {
  const caja = Array.isArray(row.cajas) ? row.cajas[0] : row.cajas;

  return {
    id: row.id,
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
  "id, caja_id, estado, monto_inicial, monto_final_declarado, total_ventas, diferencia, opened_at, closed_at, cajas(nombre)";

export async function obtenerArqueosCaja(): Promise<ArqueoCaja[]> {
  const { data, error } = await supabase
    .from("arqueos_caja")
    .select(selectArqueo)
    .order("opened_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapArqueo(row as ArqueoCajaRow));
}

export async function crearArqueoCaja(input: {
  cajaId: string;
  montoInicial: number;
}): Promise<ArqueoCaja> {
  if (!input.cajaId) {
    throw new Error("Selecciona una caja.");
  }

  const { data, error } = await supabase
    .from("arqueos_caja")
    .insert({
      caja_id: input.cajaId,
      estado: "abierto",
      monto_inicial: input.montoInicial,
      opened_at: new Date().toISOString(),
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
  montoFinalDeclarado: number;
}): Promise<ArqueoCaja> {
  const { data: arqueoActual, error: obtenerError } = await supabase
    .from("arqueos_caja")
    .select("total_ventas")
    .eq("id", input.arqueoId)
    .single();

  if (obtenerError) {
    throw new Error(obtenerError.message);
  }

  const totalVentas = Number(arqueoActual.total_ventas);
  const diferencia = input.montoFinalDeclarado - totalVentas;
  const { data, error } = await supabase
    .from("arqueos_caja")
    .update({
      estado: "cerrado",
      monto_final_declarado: input.montoFinalDeclarado,
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
