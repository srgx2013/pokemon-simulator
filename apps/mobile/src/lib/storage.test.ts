import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@pokemon-simulator/core/storage';

// Mock AsyncStorage behind the same shape the RN runtime exposes (the adapter
// reads the AsyncStorage default export, matching the real mobile runtime —
// C-2). Full factory mock: the native module must never load in a node test.
const mem = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, mobileStorage, removeItem, setItem } from './storage';

beforeEach(() => {
  mem.clear();
  vi.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => mem.get(key) ?? null);
  vi.mocked(AsyncStorage.setItem).mockImplementation(async (key: string, value: string) => {
    mem.set(key, value);
  });
  vi.mocked(AsyncStorage.removeItem).mockImplementation(async (key: string) => {
    mem.delete(key);
  });
});

// The same get/set/remove sequence the core in-memory adapter conformance test
// drives — the mobile adapter must match the shared contract (H-1, H-3, C-2).
describe('mobileStorage conformance with the core StorageAdapter contract', () => {
  it('returns null for a missing key', async () => {
    await expect(mobileStorage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('round-trips a value through setItem/getItem', async () => {
    await mobileStorage.setItem('pokemon-autosave', '{"turn":1}');
    await expect(mobileStorage.getItem('pokemon-autosave')).resolves.toBe('{"turn":1}');
  });

  it('overwrites the previous value on setItem', async () => {
    await mobileStorage.setItem('pokemon-custom-decks', 'first');
    await mobileStorage.setItem('pokemon-custom-decks', 'second');
    await expect(mobileStorage.getItem('pokemon-custom-decks')).resolves.toBe('second');
  });

  it('removes a key with removeItem', async () => {
    await mobileStorage.setItem('pokemon-autosave', 'value');
    await mobileStorage.removeItem('pokemon-autosave');
    await expect(mobileStorage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('is idempotent when removing a missing key', async () => {
    await expect(mobileStorage.removeItem('pokemon-scenarios')).resolves.toBeUndefined();
    await expect(mobileStorage.getItem('pokemon-scenarios')).resolves.toBeNull();
  });

  it('routes every STORAGE_KEYS access through the underlying AsyncStorage', async () => {
    await mobileStorage.setItem(STORAGE_KEYS.autosave, 'a');
    await mobileStorage.setItem(STORAGE_KEYS.dataVersion, '2');
    expect(mem.get('pokemon-autosave')).toBe('a');
    expect(mem.get('pokemon-data-version')).toBe('2');
  });
});

describe('named mobile adapter helpers', () => {
  it('expose the same async semantics as the adapter object', async () => {
    await setItem(STORAGE_KEYS.scenarios, '[]');
    await expect(getItem(STORAGE_KEYS.scenarios)).resolves.toBe('[]');
    await removeItem(STORAGE_KEYS.scenarios);
    await expect(getItem(STORAGE_KEYS.scenarios)).resolves.toBeNull();
  });
});