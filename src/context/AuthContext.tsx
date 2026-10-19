import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { esEnlaceRecuperacion, urlRecuperacion, validarNuevaPassword, errorEnvioRecuperacion } from "@/lib/recuperacionPassword";
import { AVISO_REGISTRO_PENDIENTE, errorRegistroCuenta } from "@/lib/registroCuenta";
import { diagnosticoCarga } from "@/lib/diagnosticoCarga";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  cargandoAuth: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  crearCuenta: (email: string, password: string, nombreLocal: string) => Promise<string | null>;
  recuperarPassword: (email: string) => Promise<void>;
  recuperandoPassword: boolean;
  aceptandoInvitacion: boolean;
  finalizarInvitacion: () => void;
  actualizarPassword: (password: string) => Promise<void>;
  finalizarRecuperacion: () => void;
  cerrarSesion: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [recuperandoPassword, setRecuperandoPassword] = useState(() => esEnlaceRecuperacion(window.location.hash));

  const [aceptandoInvitacion, setAceptandoInvitacion] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("type") === "invite");

  useEffect(() => {
    let mounted = true;

    async function cargarSesion() {
      const { data, error } = await diagnosticoCarga.medir("Recuperar sesión", () => supabase.auth.getSession());

      if (!mounted) return;

      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }

      setCargandoAuth(false);
    }

    cargarSesion();

    const { data } = supabase.auth.onAuthStateChange((event, nuevaSesion) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setRecuperandoPassword(true);
      if (event === "SIGNED_OUT") { setRecuperandoPassword(false); setAceptandoInvitacion(false); }
      setSession(nuevaSesion);
      setCargandoAuth(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function iniciarSesion(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function crearCuenta(email: string, password: string, nombreLocal: string) {
    const nombre = nombreLocal.trim();
    if (!nombre || nombre.length > 100) {
      throw new Error("El nombre del negocio debe tener entre 1 y 100 caracteres.");
    }
    const errorPassword = validarNuevaPassword(password, password);
    if (errorPassword) throw new Error(errorPassword);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_local: nombre,
        },
      },
    });

    // Supabase crea la cafetería y su administrador dentro de la transacción
    // de auth.users. El navegador nunca asigna locales ni roles.
    const errorRegistro = errorRegistroCuenta(error, data.user, Boolean(data.session));
    if (errorRegistro) throw new Error(errorRegistro);

    if (!data.session) {
      return AVISO_REGISTRO_PENDIENTE;
    }

    return null;
  }

  async function recuperarPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: urlRecuperacion(window.location.origin),
    });

    if (error) {
      throw new Error(errorEnvioRecuperacion(error));
    }
  }

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async function actualizarPassword(password: string) {
    const mensaje = validarNuevaPassword(password, password);
    if (mensaje) throw new Error(mensaje);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user: session?.user ?? null,
      session,
      cargandoAuth,
      iniciarSesion,
      crearCuenta,
      recuperarPassword,
      recuperandoPassword,
      aceptandoInvitacion,
      finalizarInvitacion: () => setAceptandoInvitacion(false),
      actualizarPassword,
      finalizarRecuperacion: () => setRecuperandoPassword(false),
      cerrarSesion,
    }),
    [cargandoAuth, session, recuperandoPassword, aceptandoInvitacion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
