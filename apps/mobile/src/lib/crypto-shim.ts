import * as Crypto from 'expo-crypto';

/**
 * Hermes (React Native) does not provide crypto.getRandomValues(), which the
 * shared core's uuid v4 usage requires. Install a minimal crypto shim on the
 * global object at app boot (web/node runtimes already provide it natively).
 */
if (
  typeof globalThis.crypto === 'undefined' ||
  typeof globalThis.crypto.getRandomValues !== 'function'
) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { getRandomValues: Crypto.getRandomValues.bind(Crypto) },
    configurable: true,
    writable: true,
  });
}