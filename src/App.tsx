import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MesaManager from './pages/MesaManager'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
<MesaManager />
    </>
  )
}

export default App
