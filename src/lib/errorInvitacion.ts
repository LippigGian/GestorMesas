export async function mensajeErrorInvitacion(error: unknown): Promise<string> {
  const detalle = error && typeof error === "object" ? error as { context?: unknown } : {};
  if (detalle.context instanceof Response) {
    const response = detalle.context;
    const body = await response.clone().json().catch(() => null);
    if (response.status === 404 && body?.code === "NOT_FOUND") {
      return "Supabase no encontró la función invitar-empleado. Verificá que esté desplegada con ese nombre en el mismo proyecto que usa la aplicación.";
    }
    if (typeof body?.error === "string" && body.error.trim()) return body.error;
    if (response.status === 401) return "Supabase rechazó la autorización de la función. Volvé a iniciar sesión y verificá la configuración Verify JWT de invitar-empleado.";
    return `El servicio de invitaciones respondió con un error HTTP ${response.status}. Revisá los registros de invitar-empleado en Supabase.`;
  }
  return "No se pudo conectar con el servicio de invitaciones. Revisá la conexión y que APP_URL en Supabase coincida con la dirección de la aplicación (incluido el puerto).";
}
