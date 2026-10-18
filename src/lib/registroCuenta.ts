const CORREO_REGISTRADO = "Ese correo ya está registrado. Iniciá sesión o recuperá tu contraseña.";

export function errorRegistroCuenta(
  error: { code?: string; message: string } | null,
  user: { identities?: unknown[] } | null,
  tieneSesion: boolean,
): string | null {
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists"
      || /^user already registered\.?$/i.test(error.message.trim())) {
      return CORREO_REGISTRADO;
    }
    return error.message;
  }

  // Auth puede devolver un usuario ofuscado sin identidades al repetir un alta.
  // Una propiedad ausente no se interpreta como un correo duplicado.
  if (!tieneSesion && Array.isArray(user?.identities) && user.identities.length === 0) {
    return CORREO_REGISTRADO;
  }
  return null;
}

export const AVISO_REGISTRO_PENDIENTE = "Si el correo permite un registro nuevo, recibirás un enlace para confirmar la cuenta. Si ya tenés una cuenta, iniciá sesión o recuperá tu contraseña.";
