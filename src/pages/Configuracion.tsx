import { useEffect, useState } from "react";
import { BriefcaseBusiness, CreditCard, ShieldCheck, Store, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfiguracionCajas } from "@/components/configuracion/ConfiguracionCajas";
import { ConfiguracionTurnos } from "@/components/configuracion/ConfiguracionTurnos";
import type { MedioPago, Proveedor } from "@/lib/types";
import {
  activarMedioPago,
  crearMedioPago,
  eliminarMedioPago,
  normalizarNombreMedioPago,
  obtenerTodosMediosPago,
} from "@/services/mediosPagoService";
import {
  activarProveedor,
  crearProveedor,
  eliminarProveedor,
  normalizarNombreProveedor,
  obtenerTodosProveedores,
  validarNombreProveedor,
} from "@/services/proveedoresService";

type ConfiguracionSeccion = {
  id: string;
  nombre: string;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
};

const seccionesConfiguracion: ConfiguracionSeccion[] = [
  {
    id: "cajas",
    nombre: "Cajas",
    descripcion: "Configuracion de cajas, aperturas y cierres.",
    icono: BriefcaseBusiness,
  },
  {
    id: "usuarios",
    nombre: "Usuarios",
    descripcion: "Alta, baja y modificacion de usuarios del sistema.",
    icono: UserRound,
  },
  {
    id: "roles",
    nombre: "Roles de usuarios",
    descripcion: "Permisos y niveles de acceso por tipo de usuario.",
    icono: ShieldCheck,
  },
  {
    id: "turnos",
    nombre: "Turnos",
    descripcion: "Administracion de turnos de trabajo.",
    icono: UsersRound,
  },
  {
    id: "medios-pago",
    nombre: "Medios de pago",
    descripcion: "Efectivo, tarjetas, transferencias y otros medios.",
    icono: CreditCard,
  },
  {
    id: "proveedores",
    nombre: "Proveedores",
    descripcion: "Listado de proveedores disponibles para gastos.",
    icono: Store,
  },
];

export function Configuracion() {
  const [seccionActivaId, setSeccionActivaId] = useState(seccionesConfiguracion[0].id);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [nuevoMedioPago, setNuevoMedioPago] = useState("");
  const [cargandoMediosPago, setCargandoMediosPago] = useState(false);
  const [guardandoMediosPago, setGuardandoMediosPago] = useState(false);
  const [errorMediosPago, setErrorMediosPago] = useState<string | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [nuevoProveedor, setNuevoProveedor] = useState("");
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [guardandoProveedores, setGuardandoProveedores] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState<string | null>(null);
  const seccionActiva =
    seccionesConfiguracion.find((seccion) => seccion.id === seccionActivaId) ??
    seccionesConfiguracion[0];
  const IconoActivo = seccionActiva.icono;

  useEffect(() => {
    if (seccionActivaId !== "medios-pago") return;

    let mounted = true;

    async function cargarMediosPago() {
      try {
        setCargandoMediosPago(true);
        setErrorMediosPago(null);
        const medios = await obtenerTodosMediosPago();

        if (mounted) {
          setMediosPago(medios);
        }
      } catch (err) {
        if (mounted) {
          setErrorMediosPago(
            err instanceof Error ? err.message : "No se pudieron cargar los medios de pago"
          );
        }
      } finally {
        if (mounted) {
          setCargandoMediosPago(false);
        }
      }
    }

    cargarMediosPago();

    return () => {
      mounted = false;
    };
  }, [seccionActivaId]);

  useEffect(() => {
    if (seccionActivaId !== "proveedores") return;

    let mounted = true;

    async function cargarProveedores() {
      try {
        setCargandoProveedores(true);
        setErrorProveedores(null);
        const data = await obtenerTodosProveedores();

        if (mounted) {
          setProveedores(data);
        }
      } catch (err) {
        if (mounted) {
          setErrorProveedores(
            err instanceof Error ? err.message : "No se pudieron cargar los proveedores"
          );
        }
      } finally {
        if (mounted) {
          setCargandoProveedores(false);
        }
      }
    }

    cargarProveedores();

    return () => {
      mounted = false;
    };
  }, [seccionActivaId]);

  const agregarMedioPago = async () => {
    const nombreNormalizado = normalizarNombreMedioPago(nuevoMedioPago);

    if (!nombreNormalizado) {
      setErrorMediosPago("El nombre del medio de pago es obligatorio.");
      return;
    }

    const yaExiste = mediosPago.some(
      (medio) => normalizarNombreMedioPago(medio.nombre) === nombreNormalizado
    );

    if (yaExiste) {
      setErrorMediosPago("Ya existe un medio de pago con ese nombre.");
      return;
    }

    try {
      setGuardandoMediosPago(true);
      setErrorMediosPago(null);
      const creado = await crearMedioPago(nuevoMedioPago);
      setMediosPago((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevoMedioPago("");
    } catch (err) {
      setErrorMediosPago(
        err instanceof Error ? err.message : "No se pudo agregar el medio de pago"
      );
    } finally {
      setGuardandoMediosPago(false);
    }
  };

  const quitarMedioPago = async (medioPago: MedioPago) => {
    if (!window.confirm(`Quitar el medio de pago "${medioPago.nombre}"?`)) {
      return;
    }

    try {
      setGuardandoMediosPago(true);
      setErrorMediosPago(null);
      await eliminarMedioPago(medioPago.id);
      setMediosPago((prev) =>
        prev.map((item) => (item.id === medioPago.id ? { ...item, activo: false } : item))
      );
    } catch (err) {
      setErrorMediosPago(
        err instanceof Error ? err.message : "No se pudo quitar el medio de pago"
      );
    } finally {
      setGuardandoMediosPago(false);
    }
  };

  const reactivarMedioPago = async (medioPago: MedioPago) => {
    try {
      setGuardandoMediosPago(true);
      setErrorMediosPago(null);
      await activarMedioPago(medioPago.id);
      setMediosPago((prev) =>
        prev.map((item) => (item.id === medioPago.id ? { ...item, activo: true } : item))
      );
    } catch (err) {
      setErrorMediosPago(
        err instanceof Error ? err.message : "No se pudo activar el medio de pago"
      );
    } finally {
      setGuardandoMediosPago(false);
    }
  };

  const agregarProveedor = async () => {
    let nombreValidado = "";

    try {
      nombreValidado = validarNombreProveedor(nuevoProveedor);
    } catch (err) {
      setErrorProveedores(err instanceof Error ? err.message : "El proveedor no es valido.");
      return;
    }

    const nombreNormalizado = normalizarNombreProveedor(nombreValidado);
    const yaExiste = proveedores.some(
      (proveedor) => normalizarNombreProveedor(proveedor.nombre) === nombreNormalizado
    );

    if (yaExiste) {
      setErrorProveedores("Ya existe un proveedor con ese nombre.");
      return;
    }

    try {
      setGuardandoProveedores(true);
      setErrorProveedores(null);
      const creado = await crearProveedor(nombreValidado);
      setProveedores((prev) =>
        [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setNuevoProveedor("");
    } catch (err) {
      setErrorProveedores(err instanceof Error ? err.message : "No se pudo agregar el proveedor");
    } finally {
      setGuardandoProveedores(false);
    }
  };

  const quitarProveedor = async (proveedor: Proveedor) => {
    if (!window.confirm(`Quitar el proveedor "${proveedor.nombre}"?`)) {
      return;
    }

    try {
      setGuardandoProveedores(true);
      setErrorProveedores(null);
      await eliminarProveedor(proveedor.id);
      setProveedores((prev) =>
        prev.map((item) => (item.id === proveedor.id ? { ...item, activo: false } : item))
      );
    } catch (err) {
      setErrorProveedores(err instanceof Error ? err.message : "No se pudo quitar el proveedor");
    } finally {
      setGuardandoProveedores(false);
    }
  };

  const reactivarProveedor = async (proveedor: Proveedor) => {
    try {
      setGuardandoProveedores(true);
      setErrorProveedores(null);
      await activarProveedor(proveedor.id);
      setProveedores((prev) =>
        prev.map((item) => (item.id === proveedor.id ? { ...item, activo: true } : item))
      );
    } catch (err) {
      setErrorProveedores(err instanceof Error ? err.message : "No se pudo activar el proveedor");
    } finally {
      setGuardandoProveedores(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-128px)] bg-background">
      <aside className="w-72 border-r bg-card p-4 shadow-sm">
        <h1 className="mb-4 text-xl font-bold text-foreground">Configuracion</h1>
        <nav className="space-y-1">
          {seccionesConfiguracion.map((seccion) => {
            const Icono = seccion.icono;
            const activa = seccion.id === seccionActivaId;

            return (
              <Button
                key={seccion.id}
                className="w-full justify-start"
                type="button"
                variant={activa ? "secondary" : "ghost"}
                onClick={() => setSeccionActivaId(seccion.id)}
              >
                <Icono className="h-4 w-4" />
                {seccion.nombre}
              </Button>
            );
          })}
        </nav>
      </aside>

      <section className="flex-1 p-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <IconoActivo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{seccionActiva.nombre}</h2>
              <p className="text-sm text-muted-foreground">{seccionActiva.descripcion}</p>
            </div>
          </div>

          {seccionActivaId === "cajas" ? (
            <ConfiguracionCajas />
          ) : seccionActivaId === "turnos" ? (
            <ConfiguracionTurnos />
          ) : seccionActivaId === "medios-pago" ? (
            <div className="space-y-4">
              {errorMediosPago && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMediosPago}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo medio de pago"
                  value={nuevoMedioPago}
                  onChange={(event) => setNuevoMedioPago(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      agregarMedioPago();
                    }
                  }}
                />
                <Button disabled={guardandoMediosPago} type="button" onClick={agregarMedioPago}>
                  Agregar
                </Button>
              </div>

              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoMediosPago ? (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                          Cargando medios de pago...
                        </td>
                      </tr>
                    ) : mediosPago.length > 0 ? (
                      mediosPago.map((medio) => (
                        <tr key={medio.id} className="border-b">
                          <td className="p-3 font-medium">{medio.nombre}</td>
                          <td className="p-3">
                            <span className="rounded bg-muted px-2 py-1 text-xs">
                              {medio.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {medio.activo ? (
                              <Button
                                disabled={guardandoMediosPago}
                                size="sm"
                                type="button"
                                variant="destructive"
                                onClick={() => quitarMedioPago(medio)}
                              >
                                Quitar
                              </Button>
                            ) : (
                              <Button
                                disabled={guardandoMediosPago}
                                size="sm"
                                type="button"
                                variant="secondary"
                                onClick={() => reactivarMedioPago(medio)}
                              >
                                Activar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                          No hay medios de pago cargados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : seccionActivaId === "proveedores" ? (
            <div className="space-y-4">
              {errorProveedores && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorProveedores}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo proveedor"
                  value={nuevoProveedor}
                  onChange={(event) => setNuevoProveedor(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      agregarProveedor();
                    }
                  }}
                />
                <Button disabled={guardandoProveedores} type="button" onClick={agregarProveedor}>
                  Agregar
                </Button>
              </div>

              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoProveedores ? (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                          Cargando proveedores...
                        </td>
                      </tr>
                    ) : proveedores.length > 0 ? (
                      proveedores.map((proveedor) => (
                        <tr key={proveedor.id} className="border-b">
                          <td className="p-3 font-medium">{proveedor.nombre}</td>
                          <td className="p-3">
                            <span className="rounded bg-muted px-2 py-1 text-xs">
                              {proveedor.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {proveedor.activo ? (
                              <Button
                                disabled={guardandoProveedores}
                                size="sm"
                                type="button"
                                variant="destructive"
                                onClick={() => quitarProveedor(proveedor)}
                              >
                                Quitar
                              </Button>
                            ) : (
                              <Button
                                disabled={guardandoProveedores}
                                size="sm"
                                type="button"
                                variant="secondary"
                                onClick={() => reactivarProveedor(proveedor)}
                              >
                                Activar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                          No hay proveedores cargados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Esta seccion queda preparada para implementar mas adelante.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
