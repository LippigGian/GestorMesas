import { createClient } from "npm:@supabase/supabase-js@2.111.0";

type Environment = (name: string) => string | undefined;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Se inyectan clientes y entorno para probar sin Auth, claves ni correos reales.
export function crearHandler(factory: typeof createClient, env: Environment) {
  return async (req: Request): Promise<Response> => {
    let origin = "";
    try {
      const app = new URL(env("APP_URL") ?? "");
      if (app.protocol !== "https:" && !(app.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(app.hostname))) throw new Error("APP_URL inválida");
      origin = app.origin;
    } catch {
      return new Response(JSON.stringify({ error: "El servicio de invitaciones todavía no está configurado." }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
    const respond = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
    if (req.headers.get("Origin") && req.headers.get("Origin") !== origin) return respond(403, { error: "Origen no autorizado." });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return respond(405, { error: "Método no permitido." });
    const authorization = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authorization)) return respond(401, { error: "Ingresá nuevamente para invitar empleados." });
    const url = env("SUPABASE_URL");
    const anon = env("SUPABASE_ANON_KEY");
    const secret = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !secret) return respond(503, { error: "El servicio de invitaciones no está disponible." });
    let solicitudId: string | undefined;
    let reservado = false;
    const admin = factory(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const client = factory(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: auth, error: authError } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
      if (authError || !auth.user) return respond(401, { error: "Tu sesión venció. Volvé a ingresar." });
      const text = await req.text();
      if (text.length > 8192) return respond(400, { error: "La solicitud es demasiado grande." });
      let input: Record<string, unknown>;
      try { input = JSON.parse(text); } catch { return respond(400, { error: "Revisá los datos de la invitación." }); }
      if (!input || Array.isArray(input) || typeof input !== "object"
        || Object.keys(input).some(key => !["nombre", "email", "rolId", "solicitudId"].includes(key))) return respond(400, { error: "Datos de invitación inválidos." });
      const nombre = typeof input.nombre === "string" ? input.nombre.trim().replace(/\s+/g, " ") : "";
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (!nombre || nombre.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || typeof input.rolId !== "string" || !uuid.test(input.rolId)
        || typeof input.solicitudId !== "string" || !uuid.test(input.solicitudId)) return respond(400, { error: "Completá nombre, email y un rol válido." });
      solicitudId = input.solicitudId;
      const { data: reserva, error: reservaError } = await admin.rpc("preparar_invitacion_empleado", {
        p_actor_id: auth.user.id, p_rol_id: input.rolId, p_nombre: nombre, p_email: email, p_solicitud_id: solicitudId,
      });
      if (reservaError) {
        const controlled = ["42501", "P0001"].includes(reservaError.code);
        return respond(reservaError.code === "42501" ? 403 : controlled ? 409 : 500,
          { error: controlled ? reservaError.message : "No se pudo preparar la invitación. Intentá nuevamente." });
      }
      if (reserva?.completada) return respond(200, { mensaje: "Esta invitación ya fue procesada. El empleado figura en el listado." });
      if (!reserva?.invitacion_id) return respond(500, { error: "No se pudo preparar la invitación." });
      reservado = true;
      const { data: invitacion, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: new URL("/aceptar-invitacion", origin).toString(),
        data: { nombre, empleado_invitacion_id: reserva.invitacion_id },
      });
      if (inviteError || !invitacion.user) {
        await admin.rpc("fallar_invitacion_empleado", { p_solicitud_id: solicitudId });
        if (inviteError?.code === "email_address_not_authorized") return respond(400, {
          error: "El correo predeterminado de Supabase no permite enviar a este destinatario. Configurá SMTP en Auth para invitar correos externos.",
        });
        return respond(inviteError?.status === 429 ? 429 : 400, { error: inviteError?.status === 429
          ? "Se alcanzó el límite de correos. Esperá unos minutos antes de volver a intentar."
          : "No se pudo completar la invitación. Revisá si el correo ya tiene una cuenta y la configuración de envío de Auth." });
      }
      const { error: completeError } = await admin.rpc("confirmar_invitacion_empleado", { p_solicitud_id: solicitudId, p_user_id: invitacion.user.id });
      if (completeError) return respond(409, { error: "No se pudo verificar la asociación. Actualizá el listado antes de volver a intentar." });
      return respond(200, { mensaje: "Invitación enviada. El empleado recibirá un enlace para establecer su contraseña." });
    } catch {
      // No borrar usuarios: Auth puede haber confirmado la invitación aunque se
      // pierda la respuesta. La reserva solo falla si todavía no tiene cuenta.
      if (reservado && solicitudId) { try { await admin.rpc("fallar_invitacion_empleado", { p_solicitud_id: solicitudId }); } catch { /* No eliminar cuentas ante una respuesta incierta. */ } }
      return respond(500, { error: "No se pudo confirmar el envío. Actualizá el listado y reintentá si el empleado no aparece." });
    }
  };
}

Deno.serve(crearHandler(createClient, name => Deno.env.get(name)));
