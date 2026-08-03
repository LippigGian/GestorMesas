import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginMode = "login" | "register" | "recover";

export function Login() {
  const [mode, setMode] = useState<LoginMode>("login");
  const [showPassword, setShowPassword] = useState(false);

  const title =
    mode === "login"
      ? "Ingresar"
      : mode === "register"
        ? "Crear cuenta"
        : "Recuperar contraseña";
  const description =
    mode === "login"
      ? "Accede al sistema con tu usuario o email."
      : mode === "register"
        ? "Deja preparada una nueva cuenta para el sistema."
        : "Indica tu email para recibir instrucciones de recuperación.";

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_480px]">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div>
          <div className="mb-16 inline-flex items-center rounded-md border border-white/20 px-3 py-2 text-sm font-semibold">
            Gestor Mesas
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-tight">
            Control simple para mesas, mostrador y caja.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-primary-foreground/75">
            Esta pantalla queda lista para conectar usuarios, roles y locales cuando actives autenticación.
          </p>
        </div>
        <div className="grid max-w-2xl grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">Ventas</p>
            <p className="mt-1 text-primary-foreground/70">Historial y cobros separados.</p>
          </div>
          <div className="rounded-md border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">Caja</p>
            <p className="mt-1 text-primary-foreground/70">Arqueos por turno y medio.</p>
          </div>
          <div className="rounded-md border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">Locales</p>
            <p className="mt-1 text-primary-foreground/70">Preparado para separar datos.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-muted-foreground">Acceso</p>
              <h2 className="text-2xl font-bold">{title}</h2>
            </div>
            {mode !== "login" && (
              <Button size="icon" type="button" variant="ghost" onClick={() => setMode("login")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
          </div>

          <p className="mb-5 text-sm text-muted-foreground">{description}</p>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            {mode === "register" && (
              <label className="block text-sm font-medium">
                Nombre del negocio
                <Input className="mt-1" placeholder="Ej: Estación de café" type="text" />
              </label>
            )}

            <label className="block text-sm font-medium">
              {mode === "login" ? "Usuario o email" : "Email"}
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="nombre@email.com" type="email" />
              </div>
            </label>

            {mode !== "recover" && (
              <label className="block text-sm font-medium">
                Contraseña
                <div className="relative mt-1">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}

            {mode === "register" && (
              <label className="block text-sm font-medium">
                Repetir contraseña
                <Input className="mt-1" placeholder="••••••••" type="password" />
              </label>
            )}

            <Button className="w-full" type="submit">
              {mode === "login" ? "Ingresar" : mode === "register" ? "Crear cuenta" : "Enviar recuperación"}
            </Button>
          </form>

          <div className="mt-5 space-y-2 border-t pt-5 text-sm">
            {mode === "login" ? (
              <>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-primary transition hover:bg-muted"
                  type="button"
                  onClick={() => setMode("register")}
                >
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta nueva
                </button>
                <button
                  className="w-full rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  type="button"
                  onClick={() => setMode("recover")}
                >
                  Recuperar contraseña
                </button>
              </>
            ) : (
              <button
                className="w-full rounded-md px-3 py-2 text-primary transition hover:bg-muted"
                type="button"
                onClick={() => setMode("login")}
              >
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
