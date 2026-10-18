import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


import { SectorProvider } from './context/SectorContext';
import { CatalogoProvider } from './context/CatalogoContext';
import { LocalProvider } from './context/LocalContext';
import { ConfiguracionGeneralProvider } from './context/ConfiguracionGeneralContext';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LocalProvider>
        <SectorProvider>
          <CatalogoProvider>
            <ConfiguracionGeneralProvider>
              <App />
            </ConfiguracionGeneralProvider>
          </CatalogoProvider>
        </SectorProvider>
      </LocalProvider>
    </AuthProvider>
  </StrictMode>,
)
