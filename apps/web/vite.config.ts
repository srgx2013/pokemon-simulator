/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      // Consume @pokemon-simulator/core as raw TypeScript source (no build step).
      // Directory alias so subpath imports (@pokemon-simulator/core/data/decks,
      // @pokemon-simulator/core/types, ...) resolve with extension inference.
      '@pokemon-simulator/core': path.resolve(import.meta.dirname, '../../packages/core/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})