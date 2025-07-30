import {
  UtensilsCrossed,
  BarChart3,
  Users,
  Truck,
  LogOut,
  Clock,
  Settings,
  LayoutGrid,
} from "lucide-react"
import { Button } from "@/components/ui/button";
import { Pencil, Save } from "lucide-react";
import { Link } from 'react-router-dom';
import { useLocation } from "react-router-dom";
import { useState } from "react";

type NavbarProps = {
  modoEdicion: boolean;
  setModoEdicion: React.Dispatch<React.SetStateAction<boolean>>;
};
export function Navbar({ modoEdicion, setModoEdicion }: NavbarProps) {
const location = useLocation();
const esVistaMesas = location.pathname === "/";

const [sector, setSector] = useState<"salon" | "deck">("salon");


  return (
    <header className="bg-gray-900 text-white shadow-md">
      {/* Fila superior */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Link to="/">
          <img src="/logo.png" alt="Estación de café" className="h-8" />
          </Link>
          <Link to="/productos">
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <UtensilsCrossed className="w-5 h-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
            <BarChart3 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
            <Truck className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">Estación de café</span>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Fila intermedia */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <nav className="flex gap-2">
          <Link to="/">
            <button className="bg-gray-600 px-3 py-1 rounded">Mesas</button>
          </Link>
          <Link to="/mostrador">
            <button className="bg-gray-600 px-3 py-1 rounded">Mostrador</button>
          </Link>
          <Button variant="ghost" className="text-white hover:bg-gray-800">
            Delivery
          </Button>
          <Button onClick={() => setModoEdicion((prev) => !prev)} variant="outline">
            {modoEdicion ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            ) : (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </>
            )}
          </Button>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Fila inferior (tercera fila) */}
      {/* <div className="flex items-center px-4 py-2 gap-2 border-b border-gray-700">
        <Button variant="secondary">Salón</Button>
        <Button variant="secondary">Deck</Button>
      </div> */}
      {esVistaMesas && (
  <div className="flex items-center px-4 py-2 gap-2 border-b border-gray-700">
    <Button
      variant={sector === "salon" ? "secondary" : "ghost"}
      onClick={() => setSector("salon")}
    >
      Salón
    </Button>
    <Button
      variant={sector === "deck" ? "secondary" : "ghost"}
      onClick={() => setSector("deck")}
    >
      Deck
    </Button>
  </div>
)}

    </header>
  );
}

