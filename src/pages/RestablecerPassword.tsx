import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, CheckCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordRequisitos } from "@/components/ui/password-requisitos";
import { enlaceRecuperacionConError, validarNuevaPassword } from "@/lib/recuperacionPassword";
import "./Login.css";

export function RestablecerPassword() {
  const { user, actualizarPassword, finalizarRecuperacion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [error, setError] = useState("");
  // Recordar el error aunque el cliente de auth limpie el fragmento de la URL.
  const [errorEnlace] = useState(() => enlaceRecuperacionConError(location.search, location.hash));
  const enlaceValido = Boolean(user) && !errorEnlace;

  return <main className="login-page grid min-h-screen place-items-center p-4 sm:p-8">
    <section className="login-form-card w-full max-w-md rounded-lg border bg-card p-6 shadow-sm" aria-labelledby="restablecer-titulo">
      <p className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Recuperar acceso</p>
      <h1 id="restablecer-titulo" className="mb-3 text-2xl font-bold">Nueva contraseña</h1>
      {completado ? <>
        <div role="status" className="login-recovery-success my-5 flex items-start gap-2 rounded-md border p-3 text-sm"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Contraseña actualizada correctamente.</div>
        <Button className="w-full" onClick={() => { finalizarRecuperacion(); navigate("/", { replace: true }); }}>Continuar al sistema</Button>
      </> : !enlaceValido ? <>
        <p role="alert" className="mb-5 text-sm text-muted-foreground">El enlace no es válido, venció o ya fue utilizado. Solicitá un nuevo email de recuperación.</p>
        <Button className="w-full" onClick={() => { finalizarRecuperacion(); navigate("/login?recuperar=1", { replace: true }); }}>Solicitar otro enlace</Button>
      </> : <>
        <p className="mb-5 text-sm text-muted-foreground">Elegí una nueva contraseña para tu cuenta.</p>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (guardando) return;
          const mensaje = validarNuevaPassword(password, confirmacion);
          setError(mensaje ?? "");
          if (mensaje) return;
          setGuardando(true);
          try {
            await actualizarPassword(password);
            setPassword(""); setConfirmacion("");
            setCompletado(true);
          } catch (err) { setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña. Intentá nuevamente."); }
          finally { setGuardando(false); }
        }}>
          <div>
            <label htmlFor="nueva-password" className="mb-1 block text-sm font-medium">Nueva contraseña</label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="nueva-password" type={visible ? "text" : "password"} value={password} disabled={guardando} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-12" autoComplete="new-password" minLength={6} required aria-describedby="password-ayuda" />
              <button type="button" disabled={guardando} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible((valor) => !valor)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted-foreground">
                {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
            <PasswordRequisitos password={password} id="password-ayuda" />
          </div>
          <label className="block text-sm font-medium" htmlFor="confirmar-password">Repetir contraseña
            <Input id="confirmar-password" type={visible ? "text" : "password"} value={confirmacion} disabled={guardando} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="new-password" minLength={6} required className="mt-1" />
          </label>
          {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <Button disabled={guardando} type="submit" className="w-full">{guardando ? "Guardando…" : "Guardar nueva contraseña"}</Button>
        </form>
      </>}
    </section>
  </main>;
}
