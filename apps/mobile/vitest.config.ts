import { defineConfig } from 'vitest/config';

// Mobile workspace is unit-only (spec H-3): pure logic and the thin platform
// bridge (AsyncStorage adapter + clipboard/share wrapper) run under vitest with
// RN/Expo mocks. Intentionally no jest-expo and no UI tests — mobile UI
// acceptance is simulator-evidenced. The `src/lib/**` include matches the
// SDK 57 template's `src/` layout (design §2f said `lib/**` for the SDK 53-era
// app-root lib dir).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
  },
});