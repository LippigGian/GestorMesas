import {
  BarChart3,
  Coffee,
  LayoutGrid,
  ShoppingBag,
  MoreHorizontal,
  Calculator,
  Clock,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Truck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSector } from "@/context/SectorContext";
import { useConfiguracionGeneral } from "@/context/ConfiguracionGeneralContext";
import {
  actualizarSalon,
  crearSalon,
  desactivarSalon,
  normalizarNombreSalon,
} from "@/services/salonesService";

type NavbarProps = {
  modoEdicion: boolean;
  setModoEdicion: React.Dispatch<React.SetStateAction<boolean>>;
};

export function Navbar({ modoEdicion, setModoEdicion }: NavbarProps) {
  const menuAccesosRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const cerrarAlClickFuera = (event: PointerEvent) => {
      const menu = menuAccesosRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    };
    const cerrarConEscape = (event: KeyboardEvent) => {
      const menu = menuAccesosRef.current;
      if (event.key === "Escape" && menu?.open) {
        const focoDentro = menu.contains(document.activeElement);
        menu.open = false;
        if (focoDentro) menu.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", cerrarAlClickFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlClickFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);
  const { nombreNegocio } = useConfiguracionGeneral();
  const location = useLocation();
  const {
    sectorActual,
    setSectorActual,
    salones,
    cargandoSalones,
    errorSalones,
    recargarSalones,
  } = useSector();
  const [mostrandoSalones, setMostrandoSalones] = useState(false);
  const [nombreSalon, setNombreSalon] = useState("");
  const [salonEditandoId, setSalonEditandoId] = useState<string | null>(null);
  const [guardandoSalon, setGuardandoSalon] = useState(false);
  const [errorGestionSalones, setErrorGestionSalones] = useState<string | null>(null);

  const navButtonClass = "navbar-link";
  const navigation = [
    { to: "/", label: "Mesas", icon: LayoutGrid },
    { to: "/mostrador", label: "Mostrador", icon: ShoppingBag },
    { to: "/productos", label: "Productos", icon: UtensilsCrossed },
    { to: "/ventas", label: "Ventas", icon: BarChart3 },
    { to: "/gastos", label: "Gastos", icon: Calculator },
  ];
  const salonEditando = salones.find((salon) => salon.id === salonEditandoId);

  const limpiarFormularioSalon = () => {
    setNombreSalon("");
    setSalonEditandoId(null);
    setErrorGestionSalones(null);
  };

  const guardarSalon = async () => {
    const nombreLimpio = nombreSalon.trim().replace(/\s+/g, " ");

    if (!nombreLimpio) {
      setErrorGestionSalones("Ingresa un nombre para el salon.");
      return;
    }

    const repetido = salones.some(
      (salon) =>
        salon.id !== salonEditandoId &&
        normalizarNombreSalon(salon.nombre) === normalizarNombreSalon(nombreLimpio)
    );

    if (repetido) {
      setErrorGestionSalones("Ya existe un salon con ese nombre.");
      return;
    }

    try {
      setGuardandoSalon(true);
      setErrorGestionSalones(null);
      if (salonEditandoId) {
        await actualizarSalon(salonEditandoId, nombreLimpio);
      } else {
        await crearSalon(nombreLimpio);
      }
      limpiarFormularioSalon();
      await recargarSalones();
    } catch (err) {
      setErrorGestionSalones(err instanceof Error ? err.message : "No se pudo guardar el salon.");
    } finally {
      setGuardandoSalon(false);
    }
  };

  const eliminarSalon = async (salonId: string) => {
    const salon = salones.find((item) => item.id === salonId);
    if (!salon) return;

    if (!window.confirm(`Eliminar el salon ${salon.nombre}?`)) {
      return;
    }

    try {
      setGuardandoSalon(true);
      setErrorGestionSalones(null);
      await desactivarSalon(salonId);
      if (sectorActual === salonId) {
        const siguienteSalon = salones.find((item) => item.id !== salonId);
        if (siguienteSalon) {
          setSectorActual(siguienteSalon.id);
        }
      }
      limpiarFormularioSalon();
      await recargarSalones();
    } catch (err) {
      setErrorGestionSalones(err instanceof Error ? err.message : "No se pudo eliminar el salon.");
    } finally {
      setGuardandoSalon(false);
    }
  };

  return (
    <header className="app-navbar">
      <div className="navbar-top">
        <Link to="/" className="navbar-brand-link">
          <span className="mesas-spa-brand min-w-0" aria-label={nombreNegocio}>
            <span className="mesas-spa-brand-mark"><Coffee aria-hidden="true" className="h-4 w-4" /></span>
            <span className="max-w-64 truncate" title={nombreNegocio}>{nombreNegocio}</span>
          </span>
        </Link>
        <nav className="navbar-primary" aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <Button key={to} asChild variant="ghost" className={navButtonClass}
              data-active={location.pathname === to}>
              <Link to={to} aria-current={location.pathname === to ? "page" : undefined}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="navbar-tools">
          <details ref={menuAccesosRef} className="navbar-more">
            <summary aria-label="Más accesos" title="Más accesos"><MoreHorizontal className="h-5 w-5" aria-hidden="true" /></summary>
            <div className="navbar-more-panel">
              <Button variant="ghost" type="button"><Users className="h-4 w-4" aria-hidden="true" />Usuarios</Button>
              <Button variant="ghost" type="button"><Truck className="h-4 w-4" aria-hidden="true" />Delivery</Button>
            </div>
          </details>
          <Button asChild variant="ghost" size="icon" data-active={location.pathname === "/configuracion"}>
            <Link to="/configuracion" title="Configuración" aria-label="Configuración"
              aria-current={location.pathname === "/configuracion" ? "page" : undefined}>
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {location.pathname === "/" && (
        <div className="navbar-context">
          <div className="navbar-context-row">
            <nav className="navbar-sectors" aria-label="Salones">
              <span className="navbar-sector-label">Salones</span>
            {cargandoSalones ? (
              <span className="px-3 py-2 text-sm text-muted-foreground">Cargando salones...</span>
            ) : salones.length > 0 ? (
              salones.map((salon) => (
                <Button
                  key={salon.id}
                  onClick={() => setSectorActual(salon.id)}
                  variant={sectorActual === salon.id ? "secondary" : "ghost"}
                  className={navButtonClass}
                  data-active={sectorActual === salon.id}
                >
                  {salon.nombre}
                </Button>
              ))
            ) : (
              <span className="px-3 py-2 text-sm text-muted-foreground">Sin salones</span>
            )}
            </nav>
            <div className="navbar-context-actions">
              <span className="navbar-date"><Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                <span aria-hidden="true">·</span>
                {new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </span>
            <Button onClick={() => setModoEdicion((prev) => !prev)} variant="secondary" className="navbar-edit" aria-pressed={modoEdicion}>
              {modoEdicion ? (
                <>
                  <Save className="h-4 w-4" />
                  Finalizar edición
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Editar plano
                </>
              )}
            </Button>
            {modoEdicion && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMostrandoSalones((prev) => !prev);
                  limpiarFormularioSalon();
                }}
              >
                <Plus className="h-4 w-4" />
                Salones
              </Button>
            )}
            </div>
          </div>

          {(errorSalones || (modoEdicion && mostrandoSalones)) && (
            <div className="mt-2 rounded-md border border-white/15 bg-background p-3 text-foreground shadow-sm">
              {errorSalones && <p className="mb-2 text-sm text-destructive">{errorSalones}</p>}
              {modoEdicion && mostrandoSalones && (
                <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-md border bg-card p-3">
                    <p className="mb-2 text-sm font-semibold">
                      {salonEditando ? `Editar ${salonEditando.nombre}` : "Nuevo salon"}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre del salon"
                        value={nombreSalon}
                        onChange={(event) => {
                          setNombreSalon(event.target.value);
                          setErrorGestionSalones(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            guardarSalon();
                          }
                        }}
                      />
                      <Button disabled={guardandoSalon} type="button" onClick={guardarSalon}>
                        {salonEditando ? "Guardar" : "Agregar"}
                      </Button>
                    </div>
                    {salonEditando && (
                      <Button
                        className="mt-2"
                        disabled={guardandoSalon}
                        type="button"
                        variant="secondary"
                        onClick={limpiarFormularioSalon}
                      >
                        Cancelar edicion
                      </Button>
                    )}
                    {errorGestionSalones && (
                      <p className="mt-2 text-sm text-destructive">{errorGestionSalones}</p>
                    )}
                  </div>

                  <div className="rounded-md border bg-card p-3">
                    <p className="mb-2 text-sm font-semibold">Salones existentes</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {salones.map((salon) => (
                        <div
                          key={salon.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                        >
                          <span className="truncate font-medium">{salon.nombre}</span>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              disabled={guardandoSalon}
                              size="sm"
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSalonEditandoId(salon.id);
                                setNombreSalon(salon.nombre);
                                setErrorGestionSalones(null);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              disabled={guardandoSalon || salones.length <= 1}
                              size="icon"
                              title="Eliminar salon"
                              type="button"
                              variant="destructive"
                              onClick={() => eliminarSalon(salon.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
