# Design: Expo Mobile App (`expo-mobile-app`)

> **Change:** `expo-mobile-app`
> **Status:** Designed
> **Inputs:** `proposal.md` (scope/decisions), `spec.md` (20 requirements), `explore.md` (coupling inventory), plus live repo verification (`package.json`, `tsconfig*.json`, `vite.config.ts`, `wrangler.jsonc`, `eslint.config.js`, `scripts/*.ts`, and every `src/**` file).

This design makes the decisions the spec left open (problems a–f), grounds every path in the real repo, and defines the API/slice/risk contract for `sdd-tasks` and `sdd-apply`.

---

## 1. Chosen architecture

A npm-workspaces monorepo with one shared, platform-agnostic core consumed as **raw TypeScript source** (no build step) by both a web SPA (Vite + react-dom) and a mobile app (Expo SDK 53 + expo-router + react-native). Persistence is a single async `StorageAdapter` boundary; the store is a factory that hydrates explicitly before first render.

```
                        ┌─────────────────────────────────────────────┐
                        │        packages/core (pure TypeScript)       │
                        │                                             │
                        │  types/  data/  services/  store/  storage/  │
                        │  ┌──────┐ ┌───────────┐ ┌───────────────┐    │
                        │  │types │ │decks.ts   │ │stateExporter  │    │
                        │  │index │ │cards.gen  │ │stateImporter  │    │
                        │  └──┬───┘ │pokemonTcgApi│ promptGenerator│   │
                        │     │     └─────┬─────┘ └───────────────┘    │
                        │     │           │          store/gameStore   │
                        │     │           └──────────► (factory+hydrate)│
                        │     │             storage/types.ts           │
                        │     │             (StorageAdapter + in-memory)│
                        │     └──────────────────────┴────────────────  │
                        │        exports: ., /types, /data/decks,      │
                        │        /services/*, /store, /storage         │
                        └───────────────┬─────────────────┬────────────┘
                                        │ source import   │ source import
                    ┌───────────────────▼──────┐  ┌───────▼──────────────────────┐
                    │  apps/web (Vite SPA)      │  │  apps/mobile (Expo + expo-   │
                    │                           │  │  router)                     │
                    │  main.tsx: async bootstrap│  │  app/_layout.tsx: hydration  │
                    │    createGameStore        │  │    gate + tabs               │
                    │    hydrate → render       │  │  lib/storage.ts (AsyncStorage│
                    │  lib/storage.ts (local-   │  │    adapter)                  │
                    │    Storage adapter)       │  │  lib/clipboard.ts            │
                    │  components/* (react-dom) │  │  hooks/useStorage.ts         │
                    │                           │  │  components/* (react-native) │
                    └───────────────────────────┘  └──────────────────────────────┘
```

**Module dependency graph (verified):** `types` is the root; `pokemonTcgApi` ← `decks` ← `stateExporter` ← `gameStore`; `stateImporter` and `promptGenerator` depend only on `types` + `uuid`. **Only `gameStore.ts` touches storage at module load** (the `const saved = loadAutoSave()` + module-level `subscribe`). `pokemonTcgApi.ts`'s four `localStorage` sites are all *inside functions*, so it is safe to move mechanically before abstraction.

### 1.1 Data flow — hydration

```
app shell (web main.tsx / mobile _layout.tsx)
   │  1. adapter = makeWebStorage()  |  makeAsyncStorage()
   │  2. store   = createGameStore(adapter)     // sync: default/empty state, registers autosave subscribe
   │  3. await hydrate(store, adapter)           // async, once
   ▼
hydrate(store, adapter)
   │  a. await migrateData(adapter)              // pokemon-data-version check; remove stale keys; set version
   │  b. autosave = await adapter.getItem('pokemon-autosave')   → parseAutoSave() (legacy-tolerant)
   │  c. decks    = await adapter.getItem('pokemon-custom-decks')→ parseDecks()
   │  d. scenarios= await adapter.getItem('pokemon-scenarios')  → parseScenarios()   [NEW read-back, see §3.5]
   │  e. store.setState({ gameState, player1Deck, player2Deck, customDecks, scenarios })
   │     and record hydrated decks for resetGame()
   ▼
render skeleton until step 3 resolves → render real UI
```

### 1.2 Data flow — autosave (async fire-and-forget)

```
any store action → zustand set() → createGameStore's subscribe((state) => {
    void adapter.setItem('pokemon-autosave', JSON.stringify({
      gameState, player1Deck, player2Deck,
    }));   // last-write-wins per key; AsyncStorage/localStorage serialize per key
})
```

Manual actions (`addCustomDeck`, `removeCustomDeck`, `loadCustomDecks`, `saveScenario`, `deleteScenario`) become `async` and `await` the adapter write before returning, so their callers can gate on persistence where needed (mobile modal close, scenario save confirmation).

---

## 2. Exact decisions (a–f)

### a) bun vs npm — **npm is the sole package manager of record; bun is removed**

**Decision:** `package-lock.json` becomes the single committed lockfile; `bun.lock` is deleted. All root `build`/`test`/`deploy`/`dev` scripts are invocable via `npm run`. The two `.ts` CLI scripts (`coach`, `update-cards`) run under Node's native type-stripping (`node scripts/*.ts`), not `bun run`.

**Rationale (verified):**
- Spec A-2 *mandates* a single committed `package-lock.json` and `npm run` for build/test/deploy. Session context fixes `npm test` as the Strict-TDD command. Keeping bun as a second runner would leave two lockfiles and two resolution paths — exactly the drift A-2 forbids.
- The codebase is already Node-strip-friendly: `erasableSyntaxOnly: true` is set in `tsconfig.app.json`/`tsconfig.node.json`, and `scripts/fetch-cards.ts` already uses explicit `.ts` import extensions (required by Node type-stripping).

**Two verified migration gotchas (must land in tasks):**
1. `scripts/coach-server.ts` uses `import.meta.dir` (a **bun-only** alias). Under Node it must become `import.meta.dirname` (or `path.dirname(fileURLToPath(import.meta.url))`). Shebang changes `#!/usr/bin/env bun` → `#!/usr/bin/env node`.
2. `scripts/fetch-cards.ts` has `#!/usr/bin/env bun`, imports `../src/services/pokemonTcgApi.ts`, and writes `../src/data/cards.generated.ts`. Both paths move under `packages/core/src/…` (see §3 file plan).

**Tradeoffs:** dropping bun loses its faster install/script startup, but the project's lockfile is already present (`package-lock.json` exists today), so reproducibility is not lost. Fallback if Node type-stripping rejects a script: add `tsx` as a dev dependency and run `tsx scripts/*.ts` — note it, don't silently fork.

### b) Metro config for Expo inside npm workspaces

**Decision:** `apps/mobile/metro.config.js` uses Expo's default config plus the standard monorepo recipe: `watchFolders = [workspaceRoot]`, `resolver.nodeModulesPaths = [workspaceRoot/node_modules, projectRoot/node_modules]`, and symlink/package-exports resolution enabled. `@pokemon-simulator/core` is consumed as **source** (`exports` → `.ts`), so Metro transpiles it with `babel-preset-expo`.

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),   // hoisted deps
  path.resolve(projectRoot, 'node_modules'),      // app-local deps
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
```

**Rationale:** npm hoists most deps to the root `node_modules`; Metro (by default) only looks inside the app dir. `watchFolders` makes it treat `packages/core` as part of the project graph (so `.ts` core source is transpiled), and `nodeModulesPaths` resolves hoisted modules. This is the canonical Expo SDK 53 monorepo setup.

**Tradeoff / fallback:** `unstable_enablePackageExports` + `unstable_enableSymlinks` are the documented SDK 53 flags; if symlink resolution proves flaky in the scaffold slice, fall back to `babel-plugin-module-resolver` aliasing `@pokemon-simulator/core` → `../../packages/core/src` and drop the package-exports flag. Verified during slice 3 (mobile shell), before any screen work.

### c) Mobile component structure (expo-router tree → spec section E)

**Decision:** four tab routes via expo-router file-based navigation; the game board is the default landing tab. Shared UI (card view, board, deck selector modal) lives in `components/`, browser/platform bridges in `lib/`, and the hydration gate in `hooks/useStorage.ts` + `app/_layout.tsx`.

```
apps/mobile/
  app/_layout.tsx            # hydration gate + <Tabs> (skeleton → real app)
  app/(tabs)/index.tsx       # Game board      (E-1, E-2)
  app/(tabs)/decks.tsx       # Deck browser    (E-3, E-4, G-1)
  app/(tabs)/export.tsx      # Export          (F-1)
  app/(tabs)/scenarios.tsx   # Scenario editor (F-3)
  components/GameBoard.tsx        # active/bench/HP/energy/status/hand/discard/prizes/deck + swap/reset
  components/PokemonCardView.tsx  # <Image> card, HP, energy, status, damage
  components/DeckSelectorModal.tsx# presets + custom CRUD + external-list resolve
  components/ExportPanelView.tsx  # markdown export → clipboard + share sheet
  components/ScenarioEditorView.tsx# save/load/delete named scenarios
  components/StorageProvider.tsx  # context for adapter + hydrated flag
  hooks/useStorage.ts             # useHydrated() gate, idempotent init
  lib/storage.ts                  # AsyncStorage adapter impl
  lib/clipboard.ts                # expo-clipboard + expo-sharing wrapper
```

**Mapping to spec E/D/F/G:** `index.tsx`+`GameBoard.tsx` → E-1/E-2; `decks.tsx`+`DeckSelectorModal.tsx` → E-3/E-4/G-1; `export.tsx`+`ExportPanelView.tsx` → F-1/F-2; `scenarios.tsx`+`ScenarioEditorView.tsx` → F-3. All browser APIs are replaced per D-4: `Alert.alert` for confirms, input `Modal` for prompts, `Pressable`/`Modal` backdrops instead of document listeners, `expo-clipboard` instead of `navigator.clipboard`. Coach is absent (D-3).

### d) `StorageAdapter` interface + async hydration (spec C)

**Decision:** exact interface as specified; in-memory impl in core for tests; store becomes a **factory** + explicit **`hydrate()`**; the data-version migration becomes async `migrateData()` in core; autosave subscribe writes are fire-and-forget async. No `zustand/persist` (out of scope). Full signatures in §4.

**Key verified details that shape the refactor:**
- `gameStore.ts` is the **only** file with module-load storage. `createGameStore(adapter)` returns a zustand store initialized with `createInitialGameState()` (empty) and registers the async autosave `subscribe` capturing `adapter`.
- The module-level `const saved = loadAutoSave()` is replaced by `hydrate()`. Its legacy-format tolerance (`loadAutoSave`/`isValidPlayerState`) moves verbatim into core as `parseAutoSave(raw): AutoSaveData | null` — **no behavioral change to the parser**.
- `resetGame` currently restores `saved?.player1Deck ?? null`. Because `saved` was captured at import, the precise equivalent is: `hydrate()` records the hydrated decks in a factory closure, and `resetGame()` restores *those* (null on a fresh/empty boot, the autosaved decks otherwise). This preserves the existing `resetGame` unit test ("null on fresh") *and* web exit behavior (deck selection survives exit).
- **Scenario read-back gap (verified):** `pokemon-scenarios` is currently **write-only** — nothing calls `getItem('pokemon-scenarios')`. Spec F-3 requires scenarios to survive restarts, so `hydrate()` adds the read-back and seeds `scenarios`. This is a deliberate, spec-required fix that also improves the web app.
- `customDecks` is currently loaded lazily in `BattleField.handleOpenDeckModal`. `hydrate()` seeds `customDecks` at startup (C-3) *and* keeps `loadCustomDecks` as an async re-read action (C-5) so the existing modal trigger keeps working.
- The 7th key `pokemon-coach-session` is **web-only** (coach is a non-goal on mobile). It stays in `apps/web`, but to satisfy SC7 ("all 7 keys flow through the adapter") `ExportPanel.tsx`'s `load/save/clearCoachSession` become async over the web adapter.

### e) Shared core package boundary (exact files / exports / tsconfig)

**Decision:** `@pokemon-simulator/core` ships **source only** (`noEmit`), consumed via TypeScript `paths` (type-check) + Vite `resolve.alias` (web) + Metro `watchFolders` (mobile). Subpath exports avoid a **verified `CardData` name collision**: `decks.ts` exports `CardData` (DB shape) and `pokemonTcgApi.ts` exports a *different* `CardData` (API response shape). Subpaths keep both names without renaming.

**`packages/core/package.json`:**
```jsonc
{
  "name": "@pokemon-simulator/core",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./store": "./src/store/gameStore.ts",
    "./storage": "./src/storage/types.ts",
    "./data/decks": "./src/data/decks.ts",
    "./data/cards.generated": "./src/data/cards.generated.ts",
    "./services/pokemonTcgApi": "./src/services/pokemonTcgApi.ts",
    "./services/stateExporter": "./src/services/stateExporter.ts",
    "./services/stateImporter": "./src/services/stateImporter.ts",
    "./services/promptGenerator": "./src/services/promptGenerator.ts"
  },
  "dependencies": {
    "zustand": "^5.0.12",
    "uuid": "^13.0.0"
  }
}
```

**`src/index.ts` (root barrel — non-colliding surface only):** re-exports types, store factory/`hydrate`/`hasActiveGame`, storage contract. Does **not** re-export `pokemonTcgApi` or `decks` (their `CardData` stays namespaced under subpaths).

**Web consumption after move:**
```ts
import { createGameStore, hydrate, migrateData, hasActiveGame } from '@pokemon-simulator/core';
import type { GameStore, GameState, DeckPreset, PokemonInstance } from '@pokemon-simulator/core/types';
import { deckPresets, parseDeckListWithApi, energyColors, energyTypes } from '@pokemon-simulator/core/data/decks';
import { fetchCard, convertApiCard, convertApiTrainer, convertApiEnergy,
         fetchCardFromTcgdex, convertTcgdexToCardData } from '@pokemon-simulator/core/services/pokemonTcgApi';
import { importStateFromJson } from '@pokemon-simulator/core/services/stateImporter';
import { generateImportPrompt, generateLogPrompt } from '@pokemon-simulator/core/services/promptGenerator';
```

**Shared strict tsconfig** (`tsconfig.base.json`) — exact flags inherited by all workspaces, preserving current strictness:
```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": [],
    "paths": {
      "@pokemon-simulator/core": ["packages/core/src/index.ts"],
      "@pokemon-simulator/core/*": ["packages/core/src/*"]
    }
  }
}
```
Each workspace `tsconfig.json` `extends` this and adds its own `lib`/`types`/`jsx` where needed (web adds `DOM`, `DOM.Iterable` + `vite/client`; mobile uses Expo's `expo/tsconfig.base`; core stays DOM-free with `types: []`). **No workspace disables any strict flag** (A-3).

**Vite resolution (web):** `resolve.alias` maps `@pokemon-simulator/core` → `packages/core/src` (directory alias so subpaths resolve with extension inference).

### f) Test strategy (spec H)

**Decision:** vitest is the only test runner. Root `vitest.workspace.ts` aggregates **core + web + mobile**. Core keeps the 5 pure suites *unchanged* and adapts the 2 coupled suites; new storage/hydration/migration suites live in core. Mobile is **unit-only** (AsyncStorage adapter + clipboard wrapper under vitest with `vi.mock`); no jest-expo; UI is simulator-verified.

```ts
// vitest.workspace.ts (root)
import { defineWorkspace } from 'vitest/config';
export default defineWorkspace(['packages/core', 'apps/web', 'apps/mobile']);
```

- **`packages/core/vitest.config.ts`** — `environment: 'node'`, `include: ['src/**/*.test.ts']`. All 7 moved suites + new `storage/types.test.ts`, `store/hydrate.test.ts`, `store/migrate.test.ts`.
- **`apps/web/vitest.config.ts`** — exists but has zero tests after the move (no web component test files exist today). Root `npm test` still passes; keeps the web slot in the workspace contract.
- **`apps/mobile/vitest.config.ts`** — `environment: 'node'`, `include: ['lib/**/*.test.ts']`; `lib/storage.test.ts` mocks `@react-native-async-storage/async-storage`, `lib/clipboard.test.ts` mocks `expo-clipboard`/`expo-sharing`.

**Test-suite reconciliation (verified):** the 7 suites split as:
- **Unchanged (5):** `decks.test.ts`, `decks.async.test.ts`, `stateExporter.test.ts`, `stateImporter.test.ts`, `promptGenerator.test.ts` (their import paths are relative *within* core and resolve identically after the move).
- **Adapted (2):** `gameStore.test.ts` (store becomes factory + `await hydrate()`; `vi.stubGlobal('localStorage')` → in-memory `StorageAdapter`) and `pokemonTcgApi.test.ts` (cache fns become async over the injected adapter). Assertions are preserved; only the storage seam changes.

**Strict TDD (H-2):** the new storage/hydration/migration suites are written red → green in slice 2, before the corresponding implementation. Mobile adapter/clipboard tests are written test-first in slice 3/4.

---

## 3. File-by-file plan

All paths verified against the live repo. "Moved" = `git mv` with zero/near-zero content change; "Modified" = behavior/content change; "New" = created.

### 3.1 New files

| Path | Purpose |
|------|---------|
| `tsconfig.base.json` | Shared strict config (§2e) |
| `vitest.workspace.ts` | Root test aggregation (§2f) |
| `packages/core/package.json` | Package manifest + subpath exports |
| `packages/core/tsconfig.json` | Extends base; DOM-free |
| `packages/core/vitest.config.ts` | Node-env test runner |
| `packages/core/src/index.ts` | Root barrel (types/store/storage, no `CardData`) |
| `packages/core/src/storage/types.ts` | `StorageAdapter` + `STORAGE_KEYS` + `createInMemoryStorage()` |
| `packages/core/src/storage/types.test.ts` | In-memory adapter conformance (H-1) |
| `packages/core/src/store/hydrate.ts` | `hydrate()` + `migrateData()` + parsers (or colocated in gameStore.ts) |
| `packages/core/src/store/hydrate.test.ts` | Hydration order, legacy tolerance, idempotency |
| `packages/core/src/store/migrate.test.ts` | Data-version migration, malformed-data tolerance |
| `apps/web/package.json` | `@pokemon-simulator/web` manifest |
| `apps/web/tsconfig.json` | Extends base + DOM libs + `vite/client` |
| `apps/web/src/lib/storage.ts` | `localStorage` adapter impl |
| `apps/mobile/**` | Expo scaffold: `package.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `vitest.config.ts`, `app/_layout.tsx`, `app/(tabs)/*.tsx`, `components/*`, `lib/storage.ts`, `lib/clipboard.ts`, `lib/clipboard.test.ts`, `lib/storage.test.ts`, `hooks/useStorage.ts` |

### 3.2 Moved files (→ `packages/core/src/…`, zero behavior change)

| From | To | Notes |
|------|-----|-------|
| `src/types/index.ts` | `packages/core/src/types/index.ts` | zero change |
| `src/data/decks.ts` | `packages/core/src/data/decks.ts` | zero change (keeps `parseDeckListWithApi`, `energyColors`, `energyTypes`, `cardDatabase`, `deckPresets`) |
| `src/data/cards.generated.ts` | `packages/core/src/data/cards.generated.ts` | zero change (~100KB) |
| `src/services/stateExporter.ts` | `packages/core/src/services/stateExporter.ts` | zero change |
| `src/services/stateImporter.ts` | `packages/core/src/services/stateImporter.ts` | zero change |
| `src/services/promptGenerator.ts` | `packages/core/src/services/promptGenerator.ts` | zero change |
| `src/data/decks.test.ts` | `packages/core/src/data/decks.test.ts` | zero change |
| `src/data/decks.async.test.ts` | `packages/core/src/data/decks.async.test.ts` | zero change (mock path `../services/pokemonTcgApi` stays relative-valid) |
| `src/services/stateExporter.test.ts` | `packages/core/src/services/stateExporter.test.ts` | zero change |
| `src/services/stateImporter.test.ts` | `packages/core/src/services/stateImporter.test.ts` | zero change |
| `src/services/promptGenerator.test.ts` | `packages/core/src/services/promptGenerator.test.ts` | zero change |
| `index.html` | `apps/web/index.html` | zero change |
| `public/*` | `apps/web/public/*` | zero change |
| `wrangler.jsonc` | `apps/web/wrangler.jsonc` | zero change (deploy becomes web-scoped) |
| `src/index.css`, `src/App.css`, `src/vite-env.d.ts`, `src/assets/*` | `apps/web/src/…` | zero change |

### 3.3 Modified files

| Path | Nature of change |
|------|------------------|
| `package.json` (root) | Add `"workspaces": ["packages/*", "apps/*"]`; keep `test`/`test:watch`/`lint`; rewrite `dev`/`build`/`deploy` to `--workspace @pokemon-simulator/web`; `coach`/`update-cards` → `node scripts/*.ts`; add `build:mobile`. Delete `bun`-specific invocation. |
| `bun.lock` | **Delete** (replaced by committed `package-lock.json`) |
| `tsconfig.json` (root) | Point references at workspace configs (or become a thin solution-file) |
| `tsconfig.app.json`, `tsconfig.node.json` | Fold into `apps/web/tsconfig.json` (extends base); remove from root |
| `vite.config.ts` → `apps/web/vite.config.ts` | Add `resolve.alias` for `@pokemon-simulator/core`; keep `@cloudflare/vite-plugin`; keep web `test` block (empty) |
| `eslint.config.js` | Update `files`/ignores to cover `packages/*` and `apps/*`; add `globals.browser` only for web, node for scripts/core |
| `.gitignore` | Add `apps/mobile/node_modules`, `.expo`, Expo native build dirs |
| `scripts/fetch-cards.ts` | Shebang → node; import `../packages/core/src/services/pokemonTcgApi.ts`; output `../packages/core/src/data/cards.generated.ts`; update the header comment |
| `scripts/coach-server.ts` | Shebang → node; `import.meta.dir` → `import.meta.dirname` |
| `src/services/pokemonTcgApi.ts` → `packages/core/src/services/pokemonTcgApi.ts` | **Moves unchanged in slice 1** (its `localStorage` calls are function-local, so `decks.ts`/`decks.async.test.ts` resolve within core). Modified in slice 2: cache fns (`getCache`/`setCache`/`getTcgdexCache`/`setTcgdexCache`) accept adapter + become async; keep `fetch`/backoff/timeout/`AbortSignal.timeout` logic intact |
| `src/services/pokemonTcgApi.test.ts` → `packages/core/src/services/pokemonTcgApi.test.ts` | **Moves unchanged in slice 1** (still `localStorage`-stubbed). Modified in slice 2: replace `localStorage` stub with injected adapter; keep assertions |
| `src/store/gameStore.ts` → `packages/core/src/store/gameStore.ts` | **Stays in `apps/web` through slice 1** (only file with module-load storage); moves + refactors in slice 2: factory `createGameStore(adapter)`; remove module-level `loadAutoSave`/`subscribe`; move `loadAutoSave`+`isValidPlayerState` into `parseAutoSave`; async autosave subscribe; async manual actions; `resetGame` restores hydrated decks |
| `src/store/gameStore.test.ts` → `packages/core/src/store/gameStore.test.ts` | **Stays in `apps/web` through slice 1**; moves + adapts in slice 2: in-memory adapter; `await hydrate()`; keep assertions |
| `src/main.tsx` → `apps/web/src/main.tsx` | Remove data-version block (moves to `migrateData`); async bootstrap `createGameStore` + `await hydrate` + render; keep Vite HMR + `beforeunload` guards |
| `src/App.tsx` → `apps/web/src/App.tsx` | Update imports to `@pokemon-simulator/core`; `window.confirm`/`prompt`/clipboard stay (web-only) |
| `src/components/BattleField.tsx`, `PokemonCard.tsx`, `ScenarioEditor.tsx`, `ExportPanel.tsx` → `apps/web/src/components/…` | Update imports to core; `ExportPanel` coach-session fns become async over web adapter (SC7) |

**Slice-1 move boundary (precise):** slice 1 moves 7 source files (types, decks, cards.generated, stateExporter, stateImporter, promptGenerator, pokemonTcgApi) + 6 test files (decks.test, decks.async.test, stateExporter.test, stateImporter.test, promptGenerator.test, pokemonTcgApi.test) — all unchanged. `gameStore.ts` + `gameStore.test.ts` stay in `apps/web` through slice 1 (only file with module-load storage) and move with the adapter/hydration refactor in slice 2. The table above shows final disposition; §5 sequences the actual moves.

---

## 4. Public API sketches (TypeScript signatures)

### 4.1 Storage contract (`packages/core/src/storage/types.ts`)

```ts
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  autosave: 'pokemon-autosave',
  customDecks: 'pokemon-custom-decks',
  scenarios: 'pokemon-scenarios',
  dataVersion: 'pokemon-data-version',
  tcgCache: 'pokemon_tcg_cache',
  tcgdexCache: 'tcgdex_cache',
  coachSession: 'pokemon-coach-session',
} as const;
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Test-only adapter with synchronous introspection. */
export function createInMemoryStorage(
  seed?: Record<string, string>,
): StorageAdapter & { dump(): Record<string, string> };
```

### 4.2 Store factory + hydration (`packages/core/src/store/gameStore.ts`, `store/hydrate.ts`)

```ts
import type { UseBoundStore, StoreApi } from 'zustand';

export interface GameStore {
  /* identical field/action shape as today's GameStore interface (see gameStore.ts:10-52) */
}

export type GameStoreApi = UseBoundStore<StoreApi<GameStore>>;

/** Synchronous: creates an empty store and registers the async autosave subscriber. */
export function createGameStore(adapter: StorageAdapter): GameStoreApi;

/** Async, idempotent: migrate → read autosave/customDecks/scenarios → seed state. */
export function hydrate(store: GameStoreApi, adapter: StorageAdapter): Promise<void>;

/** Async data-version migration; never throws; tolerant of malformed data. */
export function migrateData(adapter: StorageAdapter, dataVersion?: string): Promise<void>;

export function hasActiveGame(state: GameState): boolean;
```

### 4.3 Pokemon TCG service (`packages/core/src/services/pokemonTcgApi.ts`)

```ts
// Cache fns change from sync/localStorage to async/adapter-injected:
export async function getCache(adapter: StorageAdapter): Promise<Record<string, CacheData>>;
export async function setCache(adapter: StorageAdapter, key: string, cards: CardData[]): Promise<void>;
// (getTcgdexCache/setTcgdexCache follow the same shape)

// Unchanged public surface (fetch/backoff/pacing/timeout untouched):
export async function fetchCard(name: string, setCode?: string, number?: string): Promise<CardData | null>;
export async function fetchDeckCards(cards: { name: string; set?: string; number?: string }[]): Promise<Map<string, CardData>>;
export async function fetchCardFromTcgdex(name: string): Promise<any | null>;
export function convertApiCard(apiCard: CardData): any;
export function convertApiTrainer(apiCard: CardData): {...};
export function convertApiEnergy(apiCard: CardData): {...} | null;
export function convertTcgdexToCardData(tcgCard: any): CardData | null;
export function normalizeEnergyCost(cost?: string[]): EnergyType[];
export function normalizeCardNumber(num?: string): string | undefined;
export const setCodeMap: Record<string, string>;
export interface CardData { /* API response shape (unchanged) */ }
```

> **Important:** `fetchCard`/`fetchDeckCards`/`fetchCardFromTcgdex` call `getCache`/`setCache` internally. The adapter must be threaded through. Since `parseDeckListWithApi` (in `decks.ts`) is the public entry that consumes `fetchCard`, the cleanest seam is to have these cache-aware functions accept the adapter as their first argument, OR create a configured client via a small factory. **Decision:** add `adapter: StorageAdapter` as the first parameter of `fetchCard`, `fetchDeckCards`, `fetchCardFromTcgdex`, and `parseDeckListWithApi`. This keeps the service framework-agnostic and avoids a module singleton. (Alternative — a `createTcgApiClient(adapter)` factory — is noted in §6 but rejected for MVP to minimize churn.)

### 4.4 Core barrel (`packages/core/src/index.ts`)

```ts
export * from './types/index';
export * from './storage/types';
export { createGameStore, hydrate, migrateData, hasActiveGame } from './store/gameStore';
export type { GameStore, GameStoreApi } from './store/gameStore';
export { exportStateToMarkdown, exportStateShort, buildDeckFromPlayer, resolveGameState,
         canPayCost, findEvolutions } from './services/stateExporter';
export { importStateFromJson } from './services/stateImporter';
export { generateImportPrompt, generateLogPrompt } from './services/promptGenerator';
// NOTE: pokemonTcgApi and decks are intentionally NOT re-exported here (CardData collision).
```

### 4.5 Platform adapters

```ts
// apps/web/src/lib/storage.ts
import type { StorageAdapter } from '@pokemon-simulator/core/storage';
export const webStorage: StorageAdapter = {
  async getItem(key) { return window.localStorage.getItem(key); },
  async setItem(key, value) { window.localStorage.setItem(key, value); },
  async removeItem(key) { window.localStorage.removeItem(key); },
};

// apps/mobile/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@pokemon-simulator/core/storage';
export const mobileStorage: StorageAdapter = {
  async getItem(key) { return AsyncStorage.getItem(key); },
  async setItem(key, value) { await AsyncStorage.setItem(key, value); },
  async removeItem(key) { await AsyncStorage.removeItem(key); },
};

// apps/mobile/lib/clipboard.ts
export async function copyText(text: string): Promise<void>;      // expo-clipboard
export async function shareText(text: string): Promise<void>;      // expo-sharing (writes temp file + share sheet)
```

---

## 5. Ordering of implementation slices

Rollback-friendly, per proposal §8: every slice ends with a green `npm test` and (where relevant) a deployable web app.

| # | Slice | Scope | Why first / gate |
|---|-------|-------|------------------|
| **1** | **Monorepo scaffold + mechanical move (pure modules)** | npm workspaces; `tsconfig.base`; `vitest.workspace`; root script rewrite (a); `bun.lock`→`package-lock.json`; move 7 pure sources + 6 tests to core; move web shell files to `apps/web`; web import-path updates for types/decks/services; fix `scripts/*.ts` paths | Zero-behavior move with green regression net before any behavior change. Highest blast radius (workspace resolution) lands alone, independently revertible. **Gate:** `npm install` clean, `npm test` green (5 unchanged + pokemonTcgApi still on localStorage stub), `npm run build` + wrangler deploy smoke. |
| **2** | **Storage adapter + async hydration (behavior change)** | `storage/types.ts` + in-memory adapter; `createGameStore` + `hydrate` + `migrateData`; async manual actions; move `gameStore.ts`/`pokemonTcgApi.ts` into core with adapter injection; adapt 2 test suites; new storage/hydration/migration tests (strict TDD); web async bootstrap + web adapter; `ExportPanel` coach-session via adapter | The highest-risk change (module-load sync → async), isolated on top of slice 1. **Gate:** all core+web tests green; web plays identically (start/autosave/restore/import-export/scenario). |
| **3** | **Mobile shell** | `create-expo-app` scaffold; `metro.config.js` (b); `app/_layout.tsx` hydration gate + 4 tabs (c, D-1/D-2); `StorageProvider` + `useStorage` + AsyncStorage adapter (d, C-2); `vitest.config.ts` + adapter/clipboard unit tests (f, H-3) | Additive; proves Metro-in-workspaces resolution and the hydration gate before any screen work. **Gate:** app boots in iOS Simulator to skeleton→board; `npm test` includes mobile adapter test; background/resume no double-init. |
| **4** | **Screens** | `GameBoard.tsx` + `PokemonCardView.tsx` (E-1/E-2); `DeckSelectorModal.tsx` (E-3/E-4, G-1); `ExportPanelView.tsx` + `lib/clipboard.ts` (F-1/F-2); `ScenarioEditorView.tsx` (F-3) | Depends on shell + hydrated store. **Gate:** iOS + Android acceptance (kill-and-relaunch exact restore, deck CRUD persists, import/export round-trip, offline play). |
| **5** | **Verification sweep** | Full spec acceptance matrix; bundle sanity (B-4/N-1); `npm test` aggregate; deploy smoke | Closes the change; no new surface. |

Slice 2 is the only slice that changes web *behavior*; slices 3–5 are purely additive to mobile and leave web untouched.

---

## 6. Risks, mitigations, per-slice verification

| # | Risk | Severity | Mitigation | Verify at slice |
|---|------|----------|-----------|-----------------|
| R1 | Workspace restructure breaks web build/deploy (`bun.lock`→`package-lock.json`, hoisting) | HIGH | Isolate in slice 1; keep `npm run build`+`wrangler deploy` as the acceptance; delete `bun.lock` only after `package-lock.json` regenerates cleanly | 1 |
| R2 | Module-load sync `localStorage` → async hydration | HIGH | Factory + `hydrate` + skeleton gate; legacy parser moved verbatim; hydration-order/idempotency tests | 2 |
| R3 | Metro can't resolve hoisted/workspace deps or core `.ts` | MEDIUM | `watchFolders` + `nodeModulesPaths` + symlink flags (b); fallback `babel-plugin-module-resolver` | 3 |
| R4 | `import.meta.dir`/bun-only script syntax breaks under `node` | MEDIUM | Rewrite shebang + `import.meta.dir`→`import.meta.dirname`; `fetch-cards.ts` path updates; verify `npm run coach`/`update-cards` | 1 |
| R5 | Scenario persistence is currently write-only (web bug) | MEDIUM | `hydrate()` adds scenario read-back (spec F-3); regression test for round-trip across restart | 2 |
| R6 | `resetGame` semantics drift when `saved` moves into hydration | LOW | `hydrate()` records hydrated decks; `resetGame` restores them (preserves existing test + web exit behavior) | 2 |
| R7 | `CardData` name collision between `decks.ts` and `pokemonTcgApi.ts` | LOW | Subpath exports keep both names namespaced; no rename, no web/test churn | 1–2 |
| R8 | ~100KB `cards.generated.ts` in mobile bundle | MEDIUM | Accepted (B-4); cold-start measured in simulator (N-1) | 4–5 |
| R9 | Async autosave ordering under rapid changes | LOW | Last-write-wins per key; AsyncStorage serializes per key; revisit with a write-queue only if data loss observed | 2 |
| R10 | `AbortSignal.timeout()` on Hermes | LOW | SDK 53 Hermes has it; keep `setTimeout`+`AbortController` fallback in core if needed (G-1) | 3–4 |
| R11 | Coach unreachable / react-markdown on mobile | MEDIUM | Non-goal: no coach UI, no coach HTTP (D-3); web keeps coach unchanged | 3–4 |

**What must be verified at each slice** (folded into the slice table §5 gates):
- Slice 1: `npm install` reproducible from `package-lock.json`; `npm test` green; `npm run build` + `wrangler deploy` smoke; `npm run coach`/`update-cards` execute under node.
- Slice 2: no `localStorage`/`AsyncStorage` literal in `packages/core` except adapter impls (SC7); hydration before render on web; legacy/malformed autosave tolerance; scenario survives web reload (R5); rapid autosave last-write-wins.
- Slice 3: four tabs reachable; skeleton→board; background/resume idempotent; no coach entry point; AsyncStorage adapter conforms.
- Slice 4: kill-and-relaunch exact restore (E-2); custom-deck CRUD persists; export clipboard+share identical text (F-1); import round-trip (F-2); scenario lifecycle (F-3); offline play (G-2).
- Slice 5: full acceptance matrix; bundle load sanity; no startup/memory regression recorded.

---

## 7. Open clarifications surfaced to `sdd-tasks`

No blocker remains. Two decisions are worth flagging as task-level implementation notes (not spec changes): (1) `fetchCard`/`parseDeckListWithApi` gain `adapter` as their first parameter (vs. a client factory) — the minimal-churn option; (2) `pokemonTcgApi.test.ts` is adapted in slice 2 (not slice 1) because its `localStorage` stub still matches the un-abstracted service until the adapter injection lands.
