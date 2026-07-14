import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'

// Migración: si los datos guardados son del formato anterior (sin nombre en energías),
// los limpiamos para forzar re-importación con el nuevo formato.
const DATA_VERSION = '2';
const savedVersion = localStorage.getItem('pokemon-data-version');
if (savedVersion !== DATA_VERSION) {
      localStorage.removeItem('pokemon-custom-decks');
      localStorage.removeItem('pokemon-scenarios');
      localStorage.setItem('pokemon-data-version', DATA_VERSION);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
