import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { reconcileAttempt, recoverCreation, type QrAttempt } from "../_shared/qrReconcile.ts";

function sameSecret(supplied: string | null, expected: string): boolean {
  if (!supplied || supplied.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const syncKey = Deno.env.get("MERCADO_PAGO_QR_SYNC_KEY");
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!syncKey || !token || !supabaseUrl || !serviceKey) return new Response(null, { status: 503 });
  if (!sameSecret(req.headers.get("x-qr-sync-key"), syncKey)) return new Response(null, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: attempts, error } = await admin.from("mercado_pago_qr_intentos")
    .select("*")
    .in("estado", ["creando", "pendiente", "verificado"])
    .order("ultima_consulta_at", { ascending: true, nullsFirst: true })
    .limit(10);
  if (error) return Response.json({ error: "No se pudieron leer los cobros QR pendientes." }, { status: 503 });

  let reconciled = 0;
  let needsReview = 0;
  for (const row of attempts ?? []) {
    const attempt = row as QrAttempt;
    if (attempt.estado === "creando" && !attempt.mp_order_id
      && Date.now() - new Date(row.created_at).getTime() < 45_000) continue;
    const result = attempt.estado === "creando" && !attempt.mp_order_id
      ? await recoverCreation(admin, token, attempt)
      : await reconcileAttempt(admin, token, attempt);
    if (result.estado === "registrado") reconciled++;
    if (result.estado === "revision" || result.estado === "acreditado_sin_registrar") needsReview++;
    if (result.error) console.error("Conciliacion QR pendiente", { intentoId: attempt.id, estado: result.estado, error: result.error });
  }
  return Response.json({ checked: attempts?.length ?? 0, reconciled, needsReview });
});
