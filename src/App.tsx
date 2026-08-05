import { useState } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import './App.css'
import MesaManager from './pages/MesaManager'
import { Navbar } from './components/layout/Navbar'
import { Mostrador } from './pages/Mostrador'
import { Productos } from './pages/Productos'
import { Configuracion } from './pages/Configuracion'
import { Ventas } from './pages/Ventas'
import { Gastos } from './pages/Gastos'
import { Login } from './pages/Login'
import { useAuth } from './context/AuthContext';

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
  const { cargandoAuth, user } = useAuth();
  const ocultarNavbar = location.pathname === "/login";

  if (cargandoAuth) {
    return <PantallaCarga />;
  }

  return (
    <>
      {!ocultarNavbar && user && <Navbar modoEdicion={modoEdicion} setModoEdicion={setModoEdicion} />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<RutaPrivada><MesaManager modoEdicion={modoEdicion} /></RutaPrivada>} />
        <Route path="/mostrador" element={<RutaPrivada><Mostrador /></RutaPrivada>} />
        <Route path="/productos" element={<RutaPrivada><Productos /></RutaPrivada>} />
        <Route path="/ventas" element={<RutaPrivada><Ventas /></RutaPrivada>} />
        <Route path="/gastos" element={<RutaPrivada><Gastos /></RutaPrivada>} />
        <Route path="/configuracion" element={<RutaPrivada><Configuracion /></RutaPrivada>} />
      </Routes>
    </>
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
