export const RUTA_RECUPERACION = "/restablecer-contrasena";

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
