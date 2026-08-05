import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  cargandoAuth: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  crearCuenta: (email: string, password: string, nombreLocal: string) => Promise<string | null>;
  recuperarPassword: (email: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function cargarSesion() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }

      setCargandoAuth(false);
    }

    cargarSesion();

    const { data } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_local: nombreLocal,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      return "Cuenta creada. Revisa tu email para confirmar el acceso.";
    }

    if (!data.session) {
      return "Cuenta creada. Si Supabase pide confirmar email, confirma la cuenta y luego asocia el usuario al local.";
    }

    const { data: localExistente, error: localExistenteError } = await supabase
      .from("locales")
      .select("id")
      .eq("activo", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (localExistenteError) {
      throw new Error(localExistenteError.message);
    }

    let localId = localExistente?.id;

    if (!localId) {
      const { data: localNuevo, error: localError } = await supabase
        .from("locales")
        .insert({ nombre: nombreLocal, activo: true })
        .select("id")
        .single();

      if (localError) {
        throw new Error(localError.message);
      }

      localId = localNuevo.id;
    }

    const { data: relacionExistente, error: relacionExistenteError } = await supabase
      .from("usuarios_locales")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("local_id", localId)
      .maybeSingle();

    if (relacionExistenteError) {
      throw new Error(relacionExistenteError.message);
    }

    if (!relacionExistente) {
      const { error: relacionError } = await supabase.from("usuarios_locales").insert({
        user_id: data.user.id,
        local_id: localId,
        email: data.user.email ?? email,
        nombre: data.user.email ?? email,
        rol: "admin",
        activo: true,
      });

      if (relacionError) {
        throw new Error(relacionError.message);
      }
    }

    return null;
  }

  async function recuperarPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user: session?.user ?? null,
      session,
      cargandoAuth,
      iniciarSesion,
      crearCuenta,
      recuperarPassword,
      cerrarSesion,
    }),
    [cargandoAuth, session]
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
