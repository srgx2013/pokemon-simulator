import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { hasActiveGame, hydrate } from '@pokemon-simulator/core'
import { useGameStore } from './lib/gameStore'
import { webStorage } from './lib/storage'

// Data-version migration + state seeding now live in core: `migrateData` runs
// inside `hydrate()` (spec C-4) — no module-load sync localStorage block here
// (C-3). The store boots with empty state; hydration runs once before the real
// app renders, seeding autosave, custom decks and scenarios (C-3, F-3 read-back).

// A game is "in progress" when any meaningful state exists (see hasActiveGame
// in core). It is used below to warn before reloads while a game is live.

// Warning before a Vite dev-server full reload while a game is in progress.
// The confirm is informational: the installed Vite client (verified against
// vite@8.0.3 client.mjs) does not honor preventDefault() on this event, so the
// reload proceeds regardless of the choice. The beforeunload listener below is
// the effective cancellation path on desktop (it fires for location.reload()
// too), and the autosave in the store guarantees no data loss either way. The
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

// Skeleton → hydrate → render (C-3, D-2): the shell renders a lightweight
// skeleton until the async hydration completes, so stored state is seeded
// before any gameplay surface becomes interactive. Hydration is idempotent;
// the cancelled guard keeps StrictMode's double effect from racing the first
// render.
function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrate(useGameStore, webStorage).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <div className="boot-skeleton" role="status" aria-live="polite">
        <div className="boot-skeleton-inner">
          <div className="boot-skeleton-title">🃏 Pokemon TCG — Board Editor</div>
          <div className="boot-skeleton-subtitle">Cargando escenario guardado…</div>
        </div>
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)