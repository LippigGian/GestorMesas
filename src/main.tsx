import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


import { SectorProvider } from './context/SectorContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SectorProvider>
    <App />
    </SectorProvider>
  </StrictMode>,
)
