import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { verifyMpWebhookSignature } from "../_shared/mpWebhookSignature.ts";
import { reconcileAttempt, type QrAttempt } from "../_shared/qrReconcile.ts";

const orderIdPattern = /^ORD[A-Z0-9]{20,40}$/;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !token || !supabaseUrl || !serviceKey) return new Response(null, { status: 503 });

  const url = new URL(req.url);
  const orderId = url.searchParams.get("data.id") ?? "";
  if (!orderIdPattern.test(orderId)) return new Response(null, { status: 400 });
  if (!await verifyMpWebhookSignature(req.headers.get("x-signature"), req.headers.get("x-request-id"), orderId, secret)) {
    return new Response(null, { status: 401 });
  }

  let body: { type?: string; data?: { id?: string } };
  try { body = await req.json(); } catch { return new Response(null, { status: 400 }); }
  if (body.type !== "order" || body.data?.id !== orderId) return new Response(null, { status: 400 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.from("mercado_pago_qr_intentos")
    .select("*").eq("mp_order_id", orderId).maybeSingle();
  if (error) return new Response(null, { status: 503 });
  if (!data) return new Response(null, { status: 200 });
  const result = await reconcileAttempt(admin, token, data as QrAttempt, true);
  if (result.error) console.error("No se pudo conciliar el QR notificado", { intentoId: data.id, estado: result.estado, error: result.error });
  return new Response(null, { status: result.retryable ? 503 : 200 });
});
