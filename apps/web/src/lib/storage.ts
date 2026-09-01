import type { StorageAdapter } from '@pokemon-simulator/core/storage';

/**
 * Web `localStorage` adapter (spec C-2). Async-safe: no synchronous storage
 * access happens at import time — every read/write is Promise-based, matching
 * the async `StorageAdapter` contract the shared core is built on.
 */
export async function getItem(key: string): Promise<string | null> {
  return window.localStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  window.localStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  window.localStorage.removeItem(key);
}

export const webStorage: StorageAdapter = {
  getItem,
  setItem,
  removeItem,
};