import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { validarNuevaPassword, enlaceRecuperacionConError } from "@/lib/recuperacionPassword";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordRequisitos } from "@/components/ui/password-requisitos";
import "./Login.css";

export const RUTA_INVITACION = "/aceptar-invitacion";
export function AceptarInvitacion() {
  const { user, actualizarPassword, finalizarInvitacion, cerrarSesion } = useAuth();
  const [enlaceError] = useState(() => enlaceRecuperacionConError(window.location.search, window.location.hash));
  const [estado, setEstado] = useState<{ pendiente: boolean; nombre: string; password_establecida: boolean } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    let vigente = true;
    setCargando(true); setError("");
    if (!user || enlaceError) { setCargando(false); return; }
    supabase.rpc("estado_invitacion").then(({ data, error }) => {
      if (!vigente) return;
      if (error) setError("No pudimos verificar la invitación. Intentá nuevamente.");
      else setEstado(data);
      setCargando(false);
    });
    return () => { vigente = false; };
  }, [user?.id, enlaceError, recarga]);
  const continuar = () => { finalizarInvitacion(); window.location.assign("/"); };
  return <main className="login-page grid min-h-screen place-items-center p-4 sm:p-8">
    <section className="login-form-card w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm" aria-labelledby="invitar-titulo">
      <KeyRound aria-hidden="true" className="h-7 w-7 text-primary" />
      <h1 id="invitar-titulo" className="text-2xl font-bold">Activá tu acceso</h1>
      {cargando ? <p role="status">Verificando invitación…</p> : completado || (estado && !estado.pendiente && !enlaceError) ? <>
        <p role="status" className="login-recovery-success flex items-center gap-2 rounded-md border p-3"><CheckCircle2 aria-hidden="true" className="h-5 w-5" />Tu acceso ya está activo.</p>
        <Button className="w-full" onClick={continuar}>Ingresar a mi cafetería</Button>
      </> : !user || enlaceError || (!estado && !error) ? <>
        <p role="alert">El enlace venció, ya se utilizó o no corresponde a una invitación activa. Contactá a quien te invitó. Si ya estableciste tu contraseña, podés iniciar sesión.</p>
        <Button variant="outline" className="w-full" onClick={() => { finalizarInvitacion(); window.location.assign("/login"); }}>Ir al inicio de sesión</Button>
      </> : <>
        {estado && <p className="text-sm text-muted-foreground">Hola, {estado.nombre}. {estado.password_establecida ? "Tu contraseña ya está guardada. Completá la activación para ingresar." : "Elegí tu contraseña para ingresar a la cafetería que te invitó."}</p>}
        {estado && <form className="space-y-4" onSubmit={async event => {
          event.preventDefault(); if (guardando) return;
          if (!estado.password_establecida) {
            const mensaje = validarNuevaPassword(password, confirmacion);
            if (mensaje) { setError(mensaje); return; }
          }
          setGuardando(true); setError("");
          try {
            if (!estado.password_establecida) {
              await actualizarPassword(password);
              setEstado({ ...estado, password_establecida: true }); setPassword(""); setConfirmacion("");
            }
            const { error } = await supabase.rpc("finalizar_invitacion");
            if (error) throw new Error(error.message);
            setCompletado(true);
          } catch (err) { setError(err instanceof Error ? err.message : "No se pudo activar tu acceso."); }
          finally { setGuardando(false); }
        }}>
          {!estado.password_establecida && <>
            <label htmlFor="invitacion-password" className="block text-sm font-medium">Nueva contraseña</label>
            <Input id="invitacion-password" type="password" autoComplete="new-password" minLength={6} required value={password} disabled={guardando} onChange={e => setPassword(e.target.value)} aria-describedby="invitacion-requisitos" />
            <PasswordRequisitos password={password} id="invitacion-requisitos" />
            <label htmlFor="invitacion-confirmacion" className="block text-sm font-medium">Repetir contraseña</label>
            <Input id="invitacion-confirmacion" type="password" autoComplete="new-password" minLength={6} required value={confirmacion} disabled={guardando} onChange={e => setConfirmacion(e.target.value)} />
          </>}
          <Button disabled={guardando} className="w-full" type="submit">{guardando ? "Activando…" : "Activar mi acceso"}</Button>
        </form>}
        {error && <><p role="alert" className="text-sm text-destructive">{error}</p>{!estado && <Button variant="outline" onClick={() => setRecarga(n => n + 1)}>Reintentar</Button>}</>}
        <Button variant="ghost" disabled={guardando} onClick={() => { cerrarSesion().then(() => window.location.assign("/login")).catch(() => setError("No se pudo cerrar la sesión.")); }}>Cerrar sesión</Button>
      </>}
    </section>
  </main>;
}
