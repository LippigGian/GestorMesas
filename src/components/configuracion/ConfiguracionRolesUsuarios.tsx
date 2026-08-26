import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RolUsuario } from "@/lib/types";
import {
  activarRolUsuario,
  actualizarRolUsuario,
  crearRolUsuario,
  desactivarRolUsuario,
  normalizarNombreRolUsuario,
  obtenerRolesUsuarios,
  validarDescripcionRolUsuario,
  validarNombreRolUsuario,
} from "@/services/rolesUsuariosService";

const permisosDisponibles = [
  { id: "editar_precios", nombre: "Editar precios" },
  { id: "ver_saldos_arqueo", nombre: "Ver saldos de arqueo" },
  { id: "abrir_cerrar_caja", nombre: "Abrir y cerrar caja" },
  { id: "aplicar_descuentos", nombre: "Aplicar descuentos" },
  { id: "editar_productos", nombre: "Crear y editar productos" },
  { id: "editar_mesas", nombre: "Editar layout de mesas" },
  { id: "ver_ventas", nombre: "Ver ventas" },
  { id: "gestionar_gastos", nombre: "Gestionar gastos" },
  { id: "gestionar_usuarios", nombre: "Gestionar usuarios y roles" },
];

export function ConfiguracionRolesUsuarios() {
  const [roles, setRoles] = useState<RolUsuario[]>([]);
  const [rolEditando, setRolEditando] = useState<RolUsuario | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [permisos, setPermisos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarRoles() {
      try {
        setCargando(true);
        setError(null);
        const rolesDb = await obtenerRolesUsuarios();

        if (mounted) {
          setRoles(rolesDb);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los roles");
        }
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    cargarRoles();

    return () => {
      mounted = false;
    };
  }, []);

  const limpiarFormulario = () => {
    setRolEditando(null);
    setNombre("");
    setDescripcion("");
    setPermisos([]);
    setError(null);
  };

  const validarFormulario = () => {
    let nombreValidado = "";
    let descripcionValidada = "";

    try {
      nombreValidado = validarNombreRolUsuario(nombre);
      descripcionValidada = validarDescripcionRolUsuario(descripcion);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Revisa los datos del rol.",
        nombreValidado,
        descripcionValidada,
      };
    }

    const nombreNormalizado = normalizarNombreRolUsuario(nombreValidado);
    const yaExiste = roles.some(
      (rol) =>
        rol.id !== rolEditando?.id && normalizarNombreRolUsuario(rol.nombre) === nombreNormalizado
    );

    if (yaExiste) {
      return {
        error: "Ya existe un rol con ese nombre.",
        nombreValidado,
        descripcionValidada,
      };
    }

    return {
      error: null,
      nombreValidado,
      descripcionValidada,
    };
  };

  const guardarRol = async () => {
    const validacion = validarFormulario();

    if (validacion.error) {
      setError(validacion.error);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      const rolGuardado = rolEditando
        ? await actualizarRolUsuario({
            rolId: rolEditando.id,
            nombre: validacion.nombreValidado,
            descripcion: validacion.descripcionValidada,
            permisos,
          })
        : await crearRolUsuario({
            nombre: validacion.nombreValidado,
            descripcion: validacion.descripcionValidada,
            permisos,
          });

      setRoles((prev) => {
        const existe = prev.some((rol) => rol.id === rolGuardado.id);
        const nuevos = existe
          ? prev.map((rol) => (rol.id === rolGuardado.id ? rolGuardado : rol))
          : [...prev, rolGuardado];

        return nuevos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      limpiarFormulario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el rol");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoRol = async (rol: RolUsuario, activo: boolean) => {
    if (!activo && !window.confirm(`Eliminar el rol "${rol.nombre}"?`)) {
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      if (activo) {
        await activarRolUsuario(rol.id);
      } else {
        await desactivarRolUsuario(rol.id);
      }

      setRoles((prev) =>
        prev.map((item) => (item.id === rol.id ? { ...item, activo } : item))
      );
      if (rolEditando?.id === rol.id && !activo) {
        limpiarFormulario();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el rol");
    } finally {
      setGuardando(false);
    }
  };

  const alternarPermiso = (permisoId: string) => {
    setPermisos((prev) =>
      prev.includes(permisoId)
        ? prev.filter((permiso) => permiso !== permisoId)
        : [...prev, permisoId]
    );
  };

  const nombrePermiso = (permisoId: string) =>
    permisosDisponibles.find((permiso) => permiso.id === permisoId)?.nombre ?? permisoId;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-md border bg-muted/40 p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto_auto]">
          <Input
            placeholder="Nombre del rol"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                guardarRol();
              }
            }}
          />
          <Input
            placeholder="Descripcion opcional"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                guardarRol();
              }
            }}
          />
          <Button disabled={guardando} type="button" onClick={guardarRol}>
            {rolEditando ? "Guardar" : "Crear"}
          </Button>
          {rolEditando && (
            <Button disabled={guardando} type="button" variant="outline" onClick={limpiarFormulario}>
              Cancelar
            </Button>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Caracteristicas del rol</p>
          <div className="grid gap-2 md:grid-cols-3">
            {permisosDisponibles.map((permiso) => (
              <label
                key={permiso.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <input
                  checked={permisos.includes(permiso.id)}
                  type="checkbox"
                  onChange={() => alternarPermiso(permiso.id)}
                />
                {permiso.nombre}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Descripcion</th>
              <th className="p-3 text-left">Caracteristicas</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                  Cargando roles...
                </td>
              </tr>
            ) : roles.length > 0 ? (
              roles.map((rol) => (
                <tr key={rol.id} className="border-b">
                  <td className="p-3 font-medium">{rol.nombre}</td>
                  <td className="p-3 text-muted-foreground">{rol.descripcion || "-"}</td>
                  <td className="p-3">
                    {rol.permisos.length > 0 ? (
                      <div className="flex max-w-xl flex-wrap gap-1">
                        {rol.permisos.map((permiso) => (
                          <span key={permiso} className="rounded bg-muted px-2 py-1 text-xs">
                            {nombrePermiso(permiso)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin permisos</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      {rol.activo ? "Activo" : "Inactivo"}
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
                          setRolEditando(rol);
                          setNombre(rol.nombre);
                          setDescripcion(rol.descripcion ?? "");
                          setPermisos(rol.permisos);
                          setError(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      {rol.activo ? (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="destructive"
                          onClick={() => cambiarEstadoRol(rol, false)}
                        >
                          Eliminar
                        </Button>
                      ) : (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => cambiarEstadoRol(rol, true)}
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
                  No hay roles cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
