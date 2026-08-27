import {
  BarChart3,
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
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSector } from "@/context/SectorContext";
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

  const navButtonClass =
    "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground data-[active=true]:text-secondary-foreground";
  const navIconButtonClass =
    "text-primary-foreground transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/15 hover:text-primary-foreground hover:shadow-md hover:ring-1 hover:ring-white/25 data-[active=true]:text-secondary-foreground [&_svg]:transition-transform [&_svg]:duration-150 hover:[&_svg]:scale-110";
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
    <header className="bg-primary text-primary-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link to="/">
            <img src="/logo.png" alt="Estacion de cafe" className="h-8" />
          </Link>

          <Link to="/productos">
            <Button
              variant="ghost"
              size="icon"
              className={navIconButtonClass}
              title="Productos"
              aria-label="Productos"
            >
              <UtensilsCrossed className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            asChild
            variant={location.pathname === "/ventas" ? "secondary" : "ghost"}
            size="icon"
            className={navIconButtonClass}
            data-active={location.pathname === "/ventas"}
          >
            <Link to="/ventas" title="Ventas" aria-label="Ventas">
              <BarChart3 className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant={location.pathname === "/gastos" ? "secondary" : "ghost"}
            size="icon"
            className={navIconButtonClass}
            data-active={location.pathname === "/gastos"}
          >
            <Link to="/gastos" title="Gastos" aria-label="Gastos">
              <Calculator className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={navIconButtonClass}
            title="Usuarios"
            aria-label="Usuarios"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={navIconButtonClass}
            title="Delivery"
            aria-label="Delivery"
          >
            <Truck className="h-5 w-5" />
          </Button>
          <Button
            asChild
            variant={location.pathname === "/configuracion" ? "secondary" : "ghost"}
            size="icon"
            className={navIconButtonClass}
            data-active={location.pathname === "/configuracion"}
          >
            <Link to="/configuracion" title="Configuracion" aria-label="Configuracion">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Estacion de cafe</span>
          <Button
            variant="ghost"
            size="icon"
            className={navIconButtonClass}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/10 bg-primary/95 px-4 py-2">
        <nav className="flex gap-2">
          <Button
            asChild
            variant={location.pathname === "/" ? "secondary" : "ghost"}
            className={navButtonClass}
            data-active={location.pathname === "/"}
          >
            <Link to="/">Mesas</Link>
          </Button>

          <Button
            asChild
            variant={location.pathname === "/mostrador" ? "secondary" : "ghost"}
            className={navButtonClass}
            data-active={location.pathname === "/mostrador"}
          >
            <Link to="/mostrador">Mostrador</Link>
          </Button>

          {/* <Button variant="ghost" className={navButtonClass}>
            Delivery
          </Button> */}
        </nav>

        <div className="flex items-center gap-2 text-sm text-primary-foreground/85">
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {location.pathname === "/" && (
        <div className="border-t border-white/10 bg-primary/90 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {cargandoSalones ? (
              <span className="px-3 py-2 text-sm text-primary-foreground/80">Cargando salones...</span>
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
              <span className="px-3 py-2 text-sm text-primary-foreground/80">Sin salones</span>
            )}
            <Button onClick={() => setModoEdicion((prev) => !prev)} variant="secondary">
              {modoEdicion ? (
                <>
                  <Save className="h-4 w-4" />
                  Guardar
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Editar
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
