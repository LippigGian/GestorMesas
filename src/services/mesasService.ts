import type { Mesa } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export type SectorMesa = "salon" | "deck";

export type MesaConPosicion = Mesa & {
  sector: SectorMesa;
  x: number;
  y: number;
};

type MesaRow = {
  id: string;
  numero: string;
  tipo: "cuadrada" | "redonda";
  estado: "libre" | "ocupada";
  personas: number | null;
  sector: SectorMesa;
  x: number;
  y: number;
};

function mapMesa(row: MesaRow): MesaConPosicion {
  return {
    id: row.id,
    numero: row.numero,
    tipo: row.tipo,
    estado: row.estado,
    personas: row.personas ?? 0,
    productos: [],
    sector: row.sector,
    x: row.x,
    y: row.y,
  };
}

export async function obtenerMesas(): Promise<MesaConPosicion[]> {
  const { data, error } = await supabase
    .from("mesas")
    .select("id, numero, tipo, estado, personas, sector, x, y")
    .order("sector")
    .order("numero");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMesa);
}

export async function guardarMesa(mesa: MesaConPosicion): Promise<MesaConPosicion> {
  const { data, error } = await supabase
    .from("mesas")
    .upsert(
      {
        id: mesa.id,
        numero: mesa.numero,
        tipo: mesa.tipo,
        estado: mesa.estado ?? "libre",
        personas: mesa.personas ?? 0,
        sector: mesa.sector,
        x: mesa.x,
        y: mesa.y,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id, numero, tipo, estado, personas, sector, x, y")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMesa(data);
}

export async function actualizarPosicionMesa(
  mesaId: string,
  sector: SectorMesa,
  x: number,
  y: number
): Promise<void> {
  const { error } = await supabase
    .from("mesas")
    .update({ sector, x, y, updated_at: new Date().toISOString() })
    .eq("id", mesaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function actualizarEstadoMesa(
  mesaId: string,
  estado: "libre" | "ocupada",
  personas: number
): Promise<void> {
  const { error } = await supabase
    .from("mesas")
    .update({ estado, personas, updated_at: new Date().toISOString() })
    .eq("id", mesaId);

  if (error) {
    throw new Error(error.message);
  }
}
