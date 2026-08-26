import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RolUsuario, UsuarioSistema } from "@/lib/types";
import { obtenerRolesUsuarios } from "@/services/rolesUsuariosService";
import {
  activarUsuarioSistema,
  actualizarUsuarioSistema,
  crearUsuarioSistema,
  desactivarUsuarioSistema,
  normalizarEmailUsuario,
  obtenerUsuariosSistema,
  validarEmailUsuario,
  validarNombreUsuario,
} from "@/services/usuariosService";

export function ConfiguracionUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [roles, setRoles] = useState<RolUsuario[]>([]);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistema | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rolId, setRolId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rolesActivos = useMemo(() => roles.filter((rol) => rol.activo), [roles]);

  useEffect(() => {
    let mounted = true;

    async function cargarDatos() {
      try {
        setCargando(true);
        setError(null);
        const [usuariosDb, rolesDb] = await Promise.all([
          obtenerUsuariosSistema(),
          obtenerRolesUsuarios(),
        ]);

        if (mounted) {
          setUsuarios(usuariosDb);
          setRoles(rolesDb);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
        }
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    return () => {
      mounted = false;
    };
  }, []);

  const limpiarFormulario = () => {
    setUsuarioEditando(null);
    setNombre("");
    setEmail("");
    setRolId("");
    setError(null);
  };

  const validarFormulario = () => {
    let nombreValidado = "";
    let emailValidado = "";

    try {
      nombreValidado = validarNombreUsuario(nombre);
      emailValidado = validarEmailUsuario(email);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Revisa los datos del usuario.",
        nombreValidado,
        emailValidado,
      };
    }

    const yaExiste = usuarios.some(
      (usuario) =>
        usuario.id !== usuarioEditando?.id &&
        normalizarEmailUsuario(usuario.email) === emailValidado
    );

    if (yaExiste) {
      return {
        error: "Ya existe un usuario con ese email.",
        nombreValidado,
        emailValidado,
      };
    }

    return {
      error: null,
      nombreValidado,
      emailValidado,
    };
  };

  const guardarUsuario = async () => {
    const validacion = validarFormulario();

    if (validacion.error) {
      setError(validacion.error);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      const usuarioGuardado = usuarioEditando
        ? await actualizarUsuarioSistema({
            usuarioId: usuarioEditando.id,
            nombre: validacion.nombreValidado,
            email: validacion.emailValidado,
            rolId,
          })
        : await crearUsuarioSistema({
            nombre: validacion.nombreValidado,
            email: validacion.emailValidado,
            rolId,
          });

      setUsuarios((prev) => {
        const existe = prev.some((usuario) => usuario.id === usuarioGuardado.id);
        const nuevos = existe
          ? prev.map((usuario) =>
              usuario.id === usuarioGuardado.id ? usuarioGuardado : usuario
            )
          : [...prev, usuarioGuardado];

        return nuevos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      limpiarFormulario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoUsuario = async (usuario: UsuarioSistema, activo: boolean) => {
    if (!activo && !window.confirm(`Eliminar el usuario "${usuario.nombre}"?`)) {
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      if (activo) {
        await activarUsuarioSistema(usuario.id);
      } else {
        await desactivarUsuarioSistema(usuario.id);
      }

      setUsuarios((prev) =>
        prev.map((item) => (item.id === usuario.id ? { ...item, activo } : item))
      );
      if (usuarioEditando?.id === usuario.id && !activo) {
        limpiarFormulario();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-2 rounded-md border bg-muted/40 p-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto_auto]">
        <Input
          placeholder="Nombre del usuario"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={rolId}
          onChange={(event) => setRolId(event.target.value)}
        >
          <option value="">Sin rol</option>
          {rolesActivos.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre}
            </option>
          ))}
        </select>
        <Button disabled={guardando} type="button" onClick={guardarUsuario}>
          {usuarioEditando ? "Guardar" : "Crear"}
        </Button>
        {usuarioEditando && (
          <Button disabled={guardando} type="button" variant="outline" onClick={limpiarFormulario}>
            Cancelar
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Rol</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuarios.length > 0 ? (
              usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b">
                  <td className="p-3 font-medium">{usuario.nombre}</td>
                  <td className="p-3 text-muted-foreground">{usuario.email}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      {usuario.rolNombre ?? "Sin rol"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        disabled={guardando}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUsuarioEditando(usuario);
                          setNombre(usuario.nombre);
                          setEmail(usuario.email);
                          setRolId(usuario.rolId ?? "");
                          setError(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      {usuario.activo ? (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="destructive"
                          onClick={() => cambiarEstadoUsuario(usuario, false)}
                        >
                          Eliminar
                        </Button>
                      ) : (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => cambiarEstadoUsuario(usuario, true)}
                        >
                          Activar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                  No hay usuarios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
