import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import MesaManager from './pages/MesaManager'
import { Navbar } from './components/layout/Navbar'
import { Mostrador } from './pages/Mostrador'
import { Productos } from './pages/Productos'
import { Configuracion } from './pages/Configuracion'
import { Ventas } from './pages/Ventas'
import { Gastos } from './pages/Gastos'

function App() {
  const [modoEdicion, setModoEdicion] = useState(false);

  return (
    <Router>
      <Navbar modoEdicion={modoEdicion} setModoEdicion={setModoEdicion} />
      <Routes>
        <Route path="/" element={<MesaManager modoEdicion={modoEdicion} />} />
        <Route path="/mostrador" element={<Mostrador />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </Router>
  )
}

export default App
