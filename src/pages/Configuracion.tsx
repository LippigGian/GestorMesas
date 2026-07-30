import { useState } from "react";
import { BriefcaseBusiness, CreditCard, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

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
];

export function Configuracion() {
  const [seccionActivaId, setSeccionActivaId] = useState(seccionesConfiguracion[0].id);
  const seccionActiva =
    seccionesConfiguracion.find((seccion) => seccion.id === seccionActivaId) ??
    seccionesConfiguracion[0];
  const IconoActivo = seccionActiva.icono;

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

          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Esta seccion queda preparada para implementar mas adelante.
          </div>
        </div>
      </section>
    </main>
  );
}
