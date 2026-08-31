import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createGameStore, hydrate } from '@pokemon-simulator/core';
import type { GameStoreApi } from '@pokemon-simulator/core';
import type { StorageAdapter } from '@pokemon-simulator/core/storage';
import { mobileStorage } from '@/lib/storage';

export interface StorageContextValue {
  /** Platform storage adapter — the single persistence boundary (spec C-1). */
  adapter: StorageAdapter;
  /** True once `hydrate()` resolved for this session (D-2 skeleton gate). */
  hydrated: boolean;
  /** The one game-store instance for the whole app session. */
  store: GameStoreApi;
}

// Single store instance for the entire app session, mirroring the web singleton
// (apps/web/src/lib/gameStore.ts). Module scope keeps the instance alive across
// remounts so a resumed/backgrounded app never re-initializes the store or
// re-hydrates (D-2). The factory is sync and touches NO storage at import — the
// AsyncStorage adapter is only read during the explicit hydration below (C-3).
const mobileStore: GameStoreApi = createGameStore(mobileStorage);

// Idempotent hydration (D-2): one shared in-flight hydration per session.
// StrictMode double-effects, hot reloads, and resume remounts all observe the
// same promise. `hydrate` never throws (C-4/C-6) and always ends with a
// playable state, so the gate resolves on every path.
let hydrationPromise: Promise<void> | null = null;

export const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrationPromise ??= hydrate(mobileStore, mobileStorage).then(() => setHydrated(true));
  }, []);

  const value = useMemo(
    () => ({ adapter: mobileStorage, hydrated, store: mobileStore }),
    [hydrated],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}