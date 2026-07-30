import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


import { SectorProvider } from './context/SectorContext';
import { CatalogoProvider } from './context/CatalogoContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SectorProvider>
      <CatalogoProvider>
        <App />
      </CatalogoProvider>
    </SectorProvider>
  </StrictMode>,
)
