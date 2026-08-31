import type { StorageAdapter } from '../storage/types';
import { STORAGE_KEYS } from '../storage/types';

/**
 * Current persisted data format version (matches the legacy `DATA_VERSION = '2'`
 * that used to live in the web bootstrap). Bump it when stored formats change;
 * the migration clears the stale-format keys to force clean re-import.
 */
export const DATA_VERSION = '2';

/**
 * Async data-version migration (spec C-4). Reads `pokemon-data-version` through
 * the adapter and, when it differs from the current version, clears the
 * stale-format keys (`pokemon-custom-decks`, `pokemon-scenarios`) and writes the
 * current version — mirroring the legacy web bootstrap exactly, minus the
 * module-load sync storage access (C-3). Never throws: storage problems and
 * malformed stored values degrade to "migrate and continue".
 */
export async function migrateData(
  adapter: StorageAdapter,
  dataVersion: string = DATA_VERSION,
): Promise<void> {
  try {
    const savedVersion = await adapter.getItem(STORAGE_KEYS.dataVersion);
    if (savedVersion !== dataVersion) {
      await adapter.removeItem(STORAGE_KEYS.customDecks);
      await adapter.removeItem(STORAGE_KEYS.scenarios);
      await adapter.setItem(STORAGE_KEYS.dataVersion, dataVersion);
    }
  } catch {
    // Never throw during boot — tolerate any adapter failure (private mode,
    // corrupt storage, quota). Hydration proceeds with what it can read.
  }
}