import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webStorage, getItem, setItem, removeItem } from './storage';
import { STORAGE_KEYS } from '@pokemon-simulator/core/storage';

// Mock localStorage behind the same shape the browser exposes (the adapter
// reads `window.localStorage`, matching the real web runtime — C-2).
const store: Record<string, string> = {};
vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (_: number) => null,
  },
});

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
});

// The same get/set/remove sequence the core in-memory adapter conformance test
// drives — web behavior must match the shared contract (H-1, C-2).
describe('webStorage conformance with the core StorageAdapter contract', () => {
  it('returns null for a missing key', async () => {
    await expect(webStorage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('round-trips a value through setItem/getItem', async () => {
    await webStorage.setItem('pokemon-autosave', '{"turn":1}');
    await expect(webStorage.getItem('pokemon-autosave')).resolves.toBe('{"turn":1}');
  });

  it('overwrites the previous value on setItem', async () => {
    await webStorage.setItem('pokemon-custom-decks', 'first');
    await webStorage.setItem('pokemon-custom-decks', 'second');
    await expect(webStorage.getItem('pokemon-custom-decks')).resolves.toBe('second');
  });

  it('removes a key with removeItem', async () => {
    await webStorage.setItem('pokemon-autosave', 'value');
    await webStorage.removeItem('pokemon-autosave');
    await expect(webStorage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('is idempotent when removing a missing key', async () => {
    await expect(webStorage.removeItem('pokemon-scenarios')).resolves.toBeUndefined();
    await expect(webStorage.getItem('pokemon-scenarios')).resolves.toBeNull();
  });

  it('routes every STORAGE_KEYS access through the underlying localStorage', async () => {
    await webStorage.setItem(STORAGE_KEYS.autosave, 'a');
    await webStorage.setItem(STORAGE_KEYS.dataVersion, '2');
    expect(store['pokemon-autosave']).toBe('a');
    expect(store['pokemon-data-version']).toBe('2');
  });
});

describe('named web adapter helpers', () => {
  it('expose the same async semantics as the adapter object', async () => {
    await setItem(STORAGE_KEYS.scenarios, '[]');
    await expect(getItem(STORAGE_KEYS.scenarios)).resolves.toBe('[]');
    await removeItem(STORAGE_KEYS.scenarios);
    await expect(getItem(STORAGE_KEYS.scenarios)).resolves.toBeNull();
  });
});