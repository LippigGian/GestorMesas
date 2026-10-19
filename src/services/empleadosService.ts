import { supabase } from "@/lib/supabase";
import { mensajeErrorInvitacion } from "@/lib/errorInvitacion";

export type Empleado = {
  id: string; user_id: string; nombre: string; email: string; rol_id: string | null;
  rol_nombre: string; administrador: boolean; activo: boolean; pendiente: boolean; editable: boolean;
};

export async function obtenerEmpleados(): Promise<Empleado[]> {
  const { data, error } = await supabase.rpc("listar_empleados");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function invitarEmpleado(input: { nombre: string; email: string; rolId: string; solicitudId: string }): Promise<string> {
  const { data, error } = await supabase.functions.invoke("invitar-empleado", { body: input });
  if (error) {
    throw new Error(await mensajeErrorInvitacion(error));
  }
  return data?.mensaje ?? "La invitación fue procesada. Actualizá el listado para comprobarla.";
}

export async function actualizarEmpleado(usuario: Empleado, nombre: string, rolId: string, activo: boolean) {
  const { error } = await supabase.rpc("actualizar_empleado", {
    p_usuario_id: usuario.user_id, p_nombre: nombre, p_rol_id: rolId, p_activo: activo,
  });
  if (error) throw new Error(error.message);
}
