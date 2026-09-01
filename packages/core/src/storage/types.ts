/**
 * Storage abstraction boundary (spec C-1).
 *
 * All persistent state flows through this single async interface. Core logic
 * must never touch `localStorage`/`AsyncStorage` directly — platform adapters
 * (web, mobile, in-memory test impl) implement this contract instead.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * The 7 persistence keys used by the app (spec C-1, SC7). Every key access in
 * the shared core goes through the adapter — never through raw storage.
 * Frozen so the key set cannot drift at runtime.
 */
export const STORAGE_KEYS = Object.freeze({
  autosave: 'pokemon-autosave',
  customDecks: 'pokemon-custom-decks',
  scenarios: 'pokemon-scenarios',
  dataVersion: 'pokemon-data-version',
  tcgCache: 'pokemon_tcg_cache',
  tcgdexCache: 'tcgdex_cache',
  coachSession: 'pokemon-coach-session',
} as const);

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Test-only in-memory adapter with synchronous introspection. Seeds from an
 * initial record so tests can simulate pre-existing persisted data.
 */
export function createInMemoryStorage(
  seed?: Record<string, string>,
): StorageAdapter & { dump(): Record<string, string> } {
  const store = new Map<string, string>(Object.entries(seed ?? {}));

  return {
    async getItem(key: string): Promise<string | null> {
      return store.has(key) ? store.get(key)! : null;
    },

    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value);
    },

    async removeItem(key: string): Promise<void> {
      store.delete(key);
    },

    dump(): Record<string, string> {
      return Object.fromEntries(store.entries());
    },
  };
}