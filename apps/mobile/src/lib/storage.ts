import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@pokemon-simulator/core/storage';

/**
 * Mobile AsyncStorage adapter (spec C-2). Async-safe: no storage access happens
 * at import time — every read/write is a Promise through AsyncStorage, matching
 * the async `StorageAdapter` contract the shared core is built on.
 */
export async function getItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const mobileStorage: StorageAdapter = {
  getItem,
  setItem,
  removeItem,
};