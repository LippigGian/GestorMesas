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

type NavbarProps = {
  modoEdicion: boolean;
  setModoEdicion: React.Dispatch<React.SetStateAction<boolean>>;
};

export function Navbar({ modoEdicion, setModoEdicion }: NavbarProps) {
  return (
    <header className="bg-gray-900 text-white shadow-md">
      {/* Fila superior */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="h-8" />
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

      {/* Fila inferior */}
      <div className="flex items-center justify-between px-4 py-2">
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
    </header>
  )
}
