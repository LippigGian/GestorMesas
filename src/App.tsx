import { useState } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import './App.css'
import MesaManager from './pages/MesaManager'
import { Navbar } from './components/layout/Navbar'
import { Mostrador } from './pages/Mostrador'
import { Productos } from './pages/Productos'
import { Configuracion } from './pages/Configuracion'
import { Ventas } from './pages/Ventas'
import { Metricas } from './pages/Metricas';
import { Gastos } from './pages/Gastos'
import { Login } from './pages/Login'
import { useAuth } from './context/AuthContext';
import { useLocal } from './context/LocalContext';
import { RestablecerPassword } from './pages/RestablecerPassword';
import { RUTA_RECUPERACION, enlaceRecuperacionConError } from './lib/recuperacionPassword';

function PantallaCarga() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="rounded-md border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
        Cargando sesion...
      </div>
    </main>
  );
}

function RutaPrivada({ children }: { children: React.ReactNode }) {
  const { cargandoAuth, user } = useAuth();

  if (cargandoAuth) {
    return <PantallaCarga />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const [modoEdicion, setModoEdicion] = useState(false);
  const location = useLocation();
  const { cargandoAuth, user, recuperandoPassword, cerrarSesion } = useAuth();
  const { localId, cargandoLocal, errorLocal } = useLocal();
  const ocultarNavbar = location.pathname === "/login" || location.pathname === RUTA_RECUPERACION;

  if (cargandoAuth) {
    return <PantallaCarga />;
  }

  if ((recuperandoPassword || enlaceRecuperacionConError(location.search, location.hash)) && location.pathname !== RUTA_RECUPERACION) {
    return <Navigate to={`${RUTA_RECUPERACION}${location.search}${location.hash}`} replace />;
  }

  if (user && !ocultarNavbar) {
    if (cargandoLocal) return <PantallaCarga />;
    if (!localId || errorLocal) {
      return (
        <main className="grid min-h-screen place-items-center bg-background p-6">
          <section className="max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-semibold">No se pudo acceder a tu cafetería</h1>
            <p className="text-sm text-muted-foreground" role="alert">{errorLocal ?? "Tu cuenta no tiene una cafetería activa asociada. Contactá al administrador."}</p>
            <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => window.location.reload()}>Reintentar</button>
            <button type="button" className="ml-3 rounded-md border px-4 py-2 text-sm" onClick={() => { cerrarSesion().catch(() => window.alert("No se pudo cerrar la sesión. Intentá nuevamente.")); }}>Cerrar sesión</button>
          </section>
        </main>
      );
    }
  }

  return (
    <div className="mesas-spa-theme">
      {!ocultarNavbar && user && <Navbar modoEdicion={modoEdicion} setModoEdicion={setModoEdicion} />}
      <Routes>
        <Route path="/login" element={user && !location.search.includes("recuperar=1") ? <Navigate to="/" replace /> : <Login />} />
        <Route path={RUTA_RECUPERACION} element={<RestablecerPassword />} />
        <Route path="/" element={<RutaPrivada><MesaManager modoEdicion={modoEdicion} /></RutaPrivada>} />
        <Route path="/mostrador" element={<RutaPrivada><Mostrador /></RutaPrivada>} />
        <Route path="/productos" element={<RutaPrivada><Productos /></RutaPrivada>} />
        <Route path="/ventas" element={<RutaPrivada><Ventas /></RutaPrivada>} />
        <Route path="/metricas" element={<RutaPrivada><Metricas /></RutaPrivada>} />
        <Route path="/gastos" element={<RutaPrivada><Gastos /></RutaPrivada>} />
        <Route path="/configuracion" element={<RutaPrivada><Configuracion /></RutaPrivada>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
