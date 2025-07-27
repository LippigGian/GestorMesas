import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MesaManager from './pages/MesaManager'
import { Navbar } from './components/Navbar'
import { Mostrador } from './components/Mostrador'

function App() {
  const [modoEdicion, setModoEdicion] = useState(false);

  return (
    <>
      <Router>
        
  <Navbar modoEdicion={modoEdicion} setModoEdicion={setModoEdicion} />
  <Routes>
{/* <MesaManager modoEdicion={modoEdicion} /> */}
<Route path="/" element={<MesaManager modoEdicion={modoEdicion} />} />
<Route path="/mostrador" element={<Mostrador />} />
  </Routes>
  
  </Router>
    </>
  )
}

export default App
