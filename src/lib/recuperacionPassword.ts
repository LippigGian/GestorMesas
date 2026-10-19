export const RUTA_RECUPERACION = "/restablecer-contrasena";

export function errorEnvioRecuperacion(error: unknown): string {
  const detalle = error && typeof error === "object" ? error as { message?: unknown; status?: unknown; code?: unknown } : {};
  const codigo = typeof detalle.code === "string" ? detalle.code : "";
  if (detalle.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(codigo)) {
    return "Se alcanzó el límite de solicitudes de correo. Esperá unos minutos antes de volver a intentar.";
  }
  if (codigo === "email_address_not_authorized") return "El proveedor de correo no permite enviar a este destinatario. Revisá la configuración SMTP de Supabase.";
  if (typeof detalle.status === "number" && detalle.status >= 500) {
    return `El servicio de autenticación no pudo completar el envío (HTTP ${detalle.status}). Revisá los registros de Auth en Supabase y la configuración SMTP de Brevo.`;
  }
  const mensaje = typeof detalle.message === "string" ? detalle.message.trim() : "";
  if (mensaje && !["{}", "[]", "null", "undefined"].includes(mensaje)) {
    if (/error sending recovery email/i.test(mensaje)) return "No se pudo enviar el correo de recuperación. Revisá los registros de Auth en Supabase para conocer el motivo del fallo SMTP.";
    return mensaje;
  }
  return "No se pudo solicitar el correo de recuperación. Revisá tu conexión y los registros de Auth en Supabase.";
}

export function urlRecuperacion(origin: string) {
  return new URL(RUTA_RECUPERACION, origin).toString();
}

export function esEnlaceRecuperacion(hash: string) {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

export function enlaceRecuperacionConError(search: string, hash: string) {
  return [search.replace(/^\?/, ""), hash.replace(/^#/, "")].some((parte) => {
    const parametros = new URLSearchParams(parte);
    return parametros.has("error") || parametros.has("error_code");
  });
}

export function validarNuevaPassword(password: string, confirmacion: string) {
  if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (!/\p{Lu}/u.test(password)) return "La contraseña debe incluir al menos una letra mayúscula.";
  if (password !== confirmacion) return "Las contraseñas no coinciden.";
  return null;
}
