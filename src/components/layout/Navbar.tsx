import {
  BarChart3,
  Clock,
  LogOut,
  Pencil,
  Save,
  Settings,
  Truck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSector } from "@/context/SectorContext";

type NavbarProps = {
  modoEdicion: boolean;
  setModoEdicion: React.Dispatch<React.SetStateAction<boolean>>;
};

export function Navbar({ modoEdicion, setModoEdicion }: NavbarProps) {
  const location = useLocation();
  const { sectorActual, setSectorActual } = useSector();

  const navButtonClass =
    "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground data-[active=true]:text-secondary-foreground";

  return (
    <header className="bg-primary text-primary-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link to="/">
            <img src="/logo.png" alt="Estacion de cafe" className="h-8" />
          </Link>

          <Link to="/productos">
            <Button variant="ghost" size="icon" className={navButtonClass}>
              <UtensilsCrossed className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className={navButtonClass}>
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className={navButtonClass}>
            <Users className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className={navButtonClass}>
            <Truck className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className={navButtonClass}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Estacion de cafe</span>
          <Button variant="ghost" size="icon" className={navButtonClass}>
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

          <Button variant="ghost" className={navButtonClass}>
            Delivery
          </Button>

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
        </nav>

        <div className="flex items-center gap-2 text-sm text-primary-foreground/85">
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {location.pathname === "/" && (
        <div className="flex items-center gap-2 border-t border-white/10 bg-primary/90 px-4 py-2">
          <Button
            onClick={() => setSectorActual("salon")}
            variant={sectorActual === "salon" ? "secondary" : "ghost"}
            className={navButtonClass}
            data-active={sectorActual === "salon"}
          >
            Salon
          </Button>
          <Button
            onClick={() => setSectorActual("deck")}
            variant={sectorActual === "deck" ? "secondary" : "ghost"}
            className={navButtonClass}
            data-active={sectorActual === "deck"}
          >
            Deck
          </Button>
        </div>
      )}
    </header>
  );
}
