import { createClient } from "@supabase/supabase-js";
import { diagnosticoCarga, informeCargaPagina } from "@/lib/diagnosticoCarga";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env");
}

if (import.meta.env.DEV) {
  (window as Window & { diagnosticoCarga?: typeof informeCargaPagina }).diagnosticoCarga = informeCargaPagina;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, import.meta.env.DEV ? {
  global: { fetch: diagnosticoCarga.fetchMedido(globalThis.fetch.bind(globalThis)) },
} : undefined);
