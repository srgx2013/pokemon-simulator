import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { useGameStore } from './store/gameStore'
import type { GameState } from './types'

// Migración: si los datos guardados son del formato anterior (sin nombre en energías),
// los limpiamos para forzar re-importación con el nuevo formato.
const DATA_VERSION = '2';
const savedVersion = localStorage.getItem('pokemon-data-version');
if (savedVersion !== DATA_VERSION) {
      localStorage.removeItem('pokemon-custom-decks');
      localStorage.removeItem('pokemon-scenarios');
      localStorage.setItem('pokemon-data-version', DATA_VERSION);
}

// A game is "in progress" when any meaningful state exists: cards in hand,
// active Pokémon, prizes, a non-empty deck, or having left the setup phase.
// deck.length alone is not a reliable signal — a deck can legitimately reach
// zero mid-game while the game continues.
const hasActiveGame = (state: GameState): boolean => {
  return (
    state.phase !== 'setup' ||
    state.player1.hand.length > 0 ||
    state.player2.hand.length > 0 ||
    state.player1.active !== null ||
    state.player2.active !== null ||
    state.player1.prizes.length > 0 ||
    state.player2.prizes.length > 0 ||
    state.player1.deck.length > 0 ||
    state.player2.deck.length > 0
  );
};

// Warning before a Vite dev-server full reload while a game is in progress.
// The confirm is informational: the installed Vite client (verified against
// vite@8.0.3 client.mjs) does not honor preventDefault() on this event, so the
// reload proceeds regardless of the choice. The beforeunload listener below is
// the effective cancellation path on desktop (it fires for location.reload()
// too), and the auto-save in gameStore guarantees no data loss either way. The
// double dialog (confirm + native beforeunload) is accepted redundancy — do
// not add suppression logic to avoid it.
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', (payload) => {
    if (hasActiveGame(useGameStore.getState().gameState)) {
      const ok = window.confirm('⚠️ El simulador se va a actualizar y la vista se reiniciará.\n\nTu escenario se guardó automáticamente. ¿Actualizar ahora?');
      if (!ok) (payload as { preventDefault?: () => void }).preventDefault?.();
    }
  });
}

// Manual reload, tab close, or browser-driven reload (including Vite's
// location.reload()) that does fire beforeunload.
window.addEventListener('beforeunload', (e) => {
  if (hasActiveGame(useGameStore.getState().gameState)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
