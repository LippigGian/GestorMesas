import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MesaManager from './pages/MesaManager'
import { Navbar } from './components/navbar'

function App() {
  const [modoEdicion, setModoEdicion] = useState(false);

  return (
    <>
  <Navbar modoEdicion={modoEdicion} setModoEdicion={setModoEdicion} />
  <MesaManager modoEdicion={modoEdicion} />
    </>
  )
}

export default App
