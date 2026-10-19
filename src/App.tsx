import { lazy, Suspense, useState } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import './App.css'
import MesaManager from './pages/MesaManager'
import { Navbar } from './components/layout/Navbar'
import { Login } from './pages/Login'
import { useAuth } from './context/AuthContext';
import { usePermisos } from './context/PermisosContext';
import type { Permiso } from './lib/permisos';
import { AceptarInvitacion, RUTA_INVITACION } from './pages/AceptarInvitacion';
import { useLocal } from './context/LocalContext';
import { RestablecerPassword } from './pages/RestablecerPassword';
import { RUTA_RECUPERACION, enlaceRecuperacionConError } from './lib/recuperacionPassword';

const Mostrador = lazy(() => import('./pages/Mostrador').then(module => ({ default: module.Mostrador })));
const Productos = lazy(() => import('./pages/Productos').then(module => ({ default: module.Productos })));
const Configuracion = lazy(() => import('./pages/Configuracion').then(module => ({ default: module.Configuracion })));
const Ventas = lazy(() => import('./pages/Ventas').then(module => ({ default: module.Ventas })));
const Metricas = lazy(() => import('./pages/Metricas').then(module => ({ default: module.Metricas })));
const Gastos = lazy(() => import('./pages/Gastos').then(module => ({ default: module.Gastos })));

function PantallaCarga({ mensaje = "Recuperando sesión…" }: { mensaje?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="rounded-md border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
        {mensaje}
      </div>
    </main>
  );
}

function RutaPrivada({ children, permisos }: { children: React.ReactNode; permisos?: Permiso[] }) {
  const { tiene } = usePermisos();
  const { cargandoAuth, user } = useAuth();

  if (cargandoAuth) {
    return <PantallaCarga />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permisos && !permisos.some(tiene)) return <main className="p-6"><h1 className="text-xl font-semibold">Acceso restringido</h1><p className="mt-2 text-muted-foreground">Tu rol no permite acceder a esta sección.</p><a href="/" className="mt-4 inline-block underline">Volver a mesas</a></main>;
  return children;
}

function AppContent() {
  const [modoEdicion, setModoEdicion] = useState(false);
  const location = useLocation();
  const { cargandoAuth, user, recuperandoPassword, aceptandoInvitacion, cerrarSesion } = useAuth();
  const { localId, cargandoLocal, errorLocal } = useLocal();
  const permisos = usePermisos();
  const ocultarNavbar = location.pathname === "/login" || location.pathname === RUTA_RECUPERACION || location.pathname === RUTA_INVITACION;

  if (cargandoAuth) {
    return <PantallaCarga />;
  }

  if (aceptandoInvitacion && location.pathname !== RUTA_INVITACION) return <Navigate to={`${RUTA_INVITACION}${location.search}${location.hash}`} replace />;

  if ((recuperandoPassword || enlaceRecuperacionConError(location.search, location.hash)) && location.pathname !== RUTA_RECUPERACION && location.pathname !== RUTA_INVITACION) {
    return <Navigate to={`${RUTA_RECUPERACION}${location.search}${location.hash}`} replace />;
  }

  if (user && !ocultarNavbar) {
    if (cargandoLocal) return <PantallaCarga mensaje="Cargando cafetería…" />;
    if (!localId || errorLocal) {
      return (
        <main className="grid min-h-screen place-items-center bg-background p-6">
          <section className="max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-semibold">No se pudo acceder a tu cafetería</h1>
            <p className="text-sm text-muted-foreground" role="alert">{errorLocal ?? "Tu cuenta no tiene una cafetería activa asociada. Contactá al administrador."}</p>
            {user.user_metadata?.empleado_invitacion_id && <a className="block underline" href={RUTA_INVITACION}>Completar mi invitación</a>}
            <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => window.location.reload()}>Reintentar</button>
            <button type="button" className="ml-3 rounded-md border px-4 py-2 text-sm" onClick={() => { cerrarSesion().catch(() => window.alert("No se pudo cerrar la sesión. Intentá nuevamente.")); }}>Cerrar sesión</button>
          </section>
        </main>
      );
    }
  }

  if (user && !ocultarNavbar) {
    if (permisos.cargando) return <PantallaCarga mensaje="Verificando permisos…" />;
    if (permisos.error) return <main className="space-y-4 p-6"><h1 className="text-xl font-semibold">No se pudo verificar tu acceso</h1><p role="alert">{permisos.error}</p><button className="rounded-md border px-4 py-2" onClick={permisos.recargar}>Reintentar</button><button className="ml-3 rounded-md border px-4 py-2" onClick={() => { cerrarSesion().catch(() => window.alert("No se pudo cerrar la sesión.")); }}>Cerrar sesión</button></main>;
  }

  return (
    <div className="mesas-spa-theme">
      {!ocultarNavbar && user && <Navbar modoEdicion={modoEdicion} setModoEdicion={setModoEdicion} />}
      <Suspense fallback={<PantallaCarga mensaje="Cargando página…" />}>
      <Routes>
        <Route path="/login" element={user && !location.search.includes("recuperar=1") ? <Navigate to="/" replace /> : <Login />} />
        <Route path={RUTA_INVITACION} element={<AceptarInvitacion />} />
        <Route path={RUTA_RECUPERACION} element={<RestablecerPassword />} />
        <Route path="/" element={<RutaPrivada><MesaManager modoEdicion={modoEdicion} /></RutaPrivada>} />
        <Route path="/mostrador" element={<RutaPrivada><Mostrador /></RutaPrivada>} />
        <Route path="/productos" element={<RutaPrivada permisos={["editar_productos"]}><Productos /></RutaPrivada>} />
        <Route path="/ventas" element={<RutaPrivada permisos={["ver_ventas", "ver_saldos_arqueo", "abrir_cerrar_caja"]}><Ventas /></RutaPrivada>} />
        <Route path="/metricas" element={<RutaPrivada permisos={["ver_metricas"]}><Metricas /></RutaPrivada>} />
        <Route path="/gastos" element={<RutaPrivada permisos={["gestionar_gastos"]}><Gastos /></RutaPrivada>} />
        <Route path="/configuracion" element={<RutaPrivada permisos={["gestionar_usuarios", "gestionar_gastos", "modificar_configuracion_general"]}><Configuracion /></RutaPrivada>} />
      </Routes>
      </Suspense>
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
