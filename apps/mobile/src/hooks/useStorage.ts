import { useContext } from 'react';
import { StorageContext, type StorageContextValue } from '@/components/storage-provider';

/** Reads the storage context provided by `<StorageProvider>` (design §2c). */
export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) {
    throw new Error('useStorage must be used within a <StorageProvider>');
  }
  return ctx;
}

/**
 * Hydration gate flag (D-2). The app shell renders a skeleton while this is
 * false and the real UI (tabs) only after `hydrate()` completed — stored game,
 * decks and scenarios are seeded before any surface becomes interactive.
 */
export function useHydrated(): boolean {
  return useStorage().hydrated;
}