import { useEffect, useMemo, useRef, useState } from "react";
import { MailPlus, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermisos } from "@/context/PermisosContext";
import type { RolUsuario } from "@/lib/types";
import { obtenerRolesUsuarios } from "@/services/rolesUsuariosService";
import { actualizarEmpleado, invitarEmpleado, obtenerEmpleados, type Empleado } from "@/services/empleadosService";

export function ConfiguracionUsuarios({ onCrearRol }: { onCrearRol?: () => void }) {
  const { administrador, tiene } = usePermisos();
  const [usuarios, setUsuarios] = useState<Empleado[]>([]);
  const [roles, setRoles] = useState<RolUsuario[]>([]);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rolId, setRolId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [recarga, setRecarga] = useState(0);
  const solicitud = useRef(crypto.randomUUID());
  const rolesAsignables = useMemo(() => roles.filter(rol => rol.activo && (administrador || rol.permisos.every(p => tiene(p as Parameters<typeof tiene>[0])))), [roles, administrador, tiene]);
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    Promise.all([obtenerEmpleados(), obtenerRolesUsuarios()]).then(([usuarios, roles]) => {
      if (vigente) { setUsuarios(usuarios); setRoles(roles); setError(""); }
    }).catch(err => { if (vigente) setError(err instanceof Error ? err.message : "No se pudo cargar el equipo."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [recarga]);
  const nuevoIntento = () => { solicitud.current = crypto.randomUUID(); setMensaje(""); };
  const limpiar = () => { setEditando(null); setNombre(""); setEmail(""); setRolId(""); solicitud.current = crypto.randomUUID(); };
  const cambiarEstado = async (empleado: Empleado) => {
    if (!empleado.editable || !empleado.rol_id || guardando) return;
    if (empleado.activo && !window.confirm(`¿Desactivar el acceso de ${empleado.nombre}? Sus pedidos e historial se conservarán.`)) return;
    setGuardando(true); setError(""); setMensaje("");
    try {
      await actualizarEmpleado(empleado, empleado.nombre, empleado.rol_id, !empleado.activo);
      setRecarga(n => n + 1); setMensaje(empleado.activo ? "Acceso desactivado." : "Acceso activado.");
      if (editando?.id === empleado.id) limpiar();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo cambiar el acceso."); }
    finally { setGuardando(false); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-sm text-muted-foreground">Invitá a tu equipo por correo y asignale un rol de esta cafetería. Cada empleado establecerá su propia contraseña.</p>
      <Button variant="outline" disabled={cargando || guardando} onClick={() => setRecarga(n => n + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />Actualizar</Button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {mensaje && <p role="status" className="rounded-lg border border-green-700/30 bg-green-50 p-3 text-sm text-green-800">{mensaje}</p>}
    {!cargando && rolesAsignables.length === 0 && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><p>Primero creá un rol activo con los permisos que tendrá el empleado.</p>{onCrearRol && <Button variant="outline" className="mt-3" onClick={onCrearRol}>Crear un rol</Button>}</div>}
    <form className="grid items-end gap-4 rounded-xl border bg-muted/30 p-4 lg:grid-cols-[1fr_1.2fr_1fr_auto]" aria-label={editando ? "Editar empleado" : "Invitar empleado"} onSubmit={async event => {
      event.preventDefault(); if (guardando) return;
      setError(""); setMensaje("");
      if (!nombre.trim() || !email.trim() || !rolesAsignables.some(rol => rol.id === rolId)) { setError("Completá nombre, correo y un rol activo que puedas asignar."); return; }
      setGuardando(true);
      try {
        if (editando) {
          await actualizarEmpleado(editando, nombre.trim(), rolId, editando.activo);
          setMensaje("Empleado actualizado.");
        } else setMensaje(await invitarEmpleado({ nombre: nombre.trim(), email: email.trim().toLowerCase(), rolId, solicitudId: solicitud.current }));
        limpiar(); setRecarga(n => n + 1);
      } catch (err) { setError(err instanceof Error ? err.message : "No se pudo completar la operación."); }
      finally { setGuardando(false); }
    }}>
      <label className="space-y-2 text-sm font-medium" htmlFor="empleado-nombre"><span>Nombre</span><Input id="empleado-nombre" className="min-h-11" autoComplete="name" required maxLength={100} value={nombre} disabled={guardando} onChange={e => { setNombre(e.target.value); nuevoIntento(); }} /></label>
      <label className="space-y-2 text-sm font-medium" htmlFor="empleado-email"><span>Correo electrónico</span><Input id="empleado-email" className="min-h-11" type="email" autoComplete="email" required maxLength={254} readOnly={Boolean(editando)} value={email} disabled={guardando} onChange={e => { setEmail(e.target.value); nuevoIntento(); }} />{editando && <span className="block text-xs font-normal text-muted-foreground">El correo de acceso se conserva.</span>}</label>
      <label className="space-y-2 text-sm font-medium" htmlFor="empleado-rol"><span>Rol</span><select aria-label="Rol" id="empleado-rol" className="min-h-11 w-full rounded-md border bg-background px-3" required value={rolId} disabled={guardando || !rolesAsignables.length} onChange={e => { setRolId(e.target.value); nuevoIntento(); }}><option value="">Seleccionar rol</option>{rolesAsignables.map(rol => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select></label>
      <div className="flex gap-2"><Button type="submit" className="min-h-11" disabled={guardando || cargando || !rolesAsignables.length}><MailPlus aria-hidden="true" className="h-4 w-4" />{guardando ? "Procesando…" : editando ? "Guardar cambios" : "Invitar empleado"}</Button>{editando && <Button className="min-h-11" type="button" variant="outline" disabled={guardando} onClick={limpiar}>Cancelar</Button>}</div>
    </form>
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm"><caption className="sr-only">Equipo de esta cafetería</caption><thead className="bg-secondary text-secondary-foreground"><tr><th scope="col" className="p-3 text-left">Nombre</th><th scope="col" className="p-3 text-left">Correo</th><th scope="col" className="p-3 text-left">Rol</th><th scope="col" className="p-3 text-left">Acceso</th><th scope="col" className="p-3 text-right">Acciones</th></tr></thead>
      <tbody>{cargando ? <tr><td colSpan={5} className="p-5 text-center" role="status">Cargando equipo…</td></tr> : usuarios.map(usuario => <tr className="border-t" key={usuario.id}>
        <td className="p-3 font-medium">{usuario.nombre}</td><td className="p-3">{usuario.email}</td><td className="p-3">{usuario.rol_nombre ?? "Sin rol"}</td><td className="p-3"><span className="rounded-full bg-muted px-3 py-1 text-xs">{!usuario.activo ? "Inactivo" : usuario.pendiente ? "Invitación pendiente" : "Activo"}</span></td>
        <td className="p-3"><div className="flex justify-end gap-2">{usuario.editable ? <><Button variant="outline" className="min-h-11" disabled={guardando} onClick={() => { setEditando(usuario); setNombre(usuario.nombre); setEmail(usuario.email); setRolId(usuario.rol_id ?? ""); setError(""); setMensaje(""); }}><Pencil aria-hidden="true" className="h-4 w-4" />Editar</Button><Button className="min-h-11" variant="outline" disabled={guardando} onClick={() => void cambiarEstado(usuario)}>{usuario.activo ? "Desactivar" : "Activar"}</Button></> : <span className="text-xs text-muted-foreground">{usuario.administrador ? "Cuenta administradora" : "Acceso protegido"}</span>}</div></td>
      </tr>)}</tbody></table>
    </div>
  </div>;
}
