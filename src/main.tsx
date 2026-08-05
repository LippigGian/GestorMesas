import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


import { SectorProvider } from './context/SectorContext';
import { CatalogoProvider } from './context/CatalogoContext';
import { LocalProvider } from './context/LocalContext';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LocalProvider>
        <SectorProvider>
          <CatalogoProvider>
            <App />
          </CatalogoProvider>
        </SectorProvider>
      </LocalProvider>
    </AuthProvider>
  </StrictMode>,
)
