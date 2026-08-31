# Exploration: React Native + Expo Mobile App

> **Change:** `expo-mobile-app`
> **Date:** 2025-07-18
> **Author:** SDD Explore Phase

## Executive Summary

The pokemon-simulator codebase has a **clean core-periphery split** that makes a shared-core architecture feasible. The domain logic (types, services, store, data) lives in pure TypeScript with minimal DOM coupling. The DOM surface is concentrated in 6 files and falls into two categories: (1) **localStorage persistence** — a single abstraction layer (AsyncStorage) solves all of it, and (2) **browser-specific UI** (react-dom, document.* APIs) — fully rewritten as React Native components.

The biggest migration risk is the **100KB+ generated card database** (`cards.generated.ts`) — it ships with the app and must be included in the shared package. The Zustand store's module-level `localStorage` calls need to become a pluggable storage adapter. No Cloudflare Worker proxy exists — the external APIs (`pokemontcg.io`, `tcgdex.net`) are called directly from the client.

---

## 1. DOM Coupling Inventory

### 1.1 `src/store/gameStore.ts` — localStorage (6 sites)

| Line | Usage | Classification |
|------|-------|----------------|
| 75 | `localStorage.getItem(AUTO_SAVE_KEY)` | **Must-abstract** — autosave on startup |
| 192 | `localStorage.setItem('pokemon-custom-decks', ...)` | **Must-abstract** — custom deck CRUD |
| 200 | `localStorage.setItem('pokemon-custom-decks', ...)` | **Must-abstract** — same key, remove path |
| 206 | `localStorage.getItem('pokemon-custom-decks')` | **Must-abstract** — load decks |
| 563 | `localStorage.setItem('pokemon-scenarios', ...)` | **Must-abstract** — save scenarios |
| 581 | `localStorage.setItem('pokemon-scenarios', ...)` | **Must-abstract** — save scenarios (delete path) |
| 625 | `localStorage.setItem(AUTO_SAVE_KEY, ...)` | **Must-abstract** — subscription-based autosave |

**Abstraction approach:** Extract a `StorageAdapter` interface (`getItem`, `setItem`, `removeItem`) injected into the store. Web uses `localStorage`, RN uses `@react-native-async-storage/async-storage`. The store's `create()` call becomes `createStorageGameStore(adapter)`.

**Critical detail:** The module-level `loadAutoSave()` (line 71-99) and the `useGameStore.subscribe()` autosave (line 625-637) run at import time. For Expo, these must become async init or be deferred. This is the highest-risk refactoring point.

### 1.2 `src/main.tsx` — Bootstrap (5 sites, all browser-specific)

| Line | Usage | Classification |
|------|-------|----------------|
| 2 | `import { createRoot } from 'react-dom/client'` | **DOM-specific** — rewritten as `AppRegistry` |
| 3-4 | `import './index.css' / './App.css'` | **DOM-specific** — styles via StyleSheet |
| 11-15 | `localStorage.getItem/setItem('pokemon-data-version')` | **Must-abstract** — data migration versioning |
| 32 | `window.confirm(...)` (Vite hot reload) | **DOM-specific** — Vite-only, not needed in RN |
| 40 | `window.addEventListener('beforeunload', ...)` | **DOM-specific** — no RN equivalent; remove |
| 47 | `createRoot(document.getElementById('root')!)` | **DOM-specific** — Expo entry point |

**Disposition:** Entirely rewritten. The data versioning logic (lines 8-16) moves to shared core; the rest is browser-only.

### 1.3 `src/App.tsx` — UI + Clipboard (5 sites)

| Line | Usage | Classification |
|------|-------|----------------|
| 48 | `window.confirm(...)` | **Trivially replaceable** → `Alert.alert()` |
| 55 | `navigator.clipboard.writeText(text)` | **Trivially replaceable** → `expo-clipboard` |
| 57-62 | `document.createElement('textarea')` fallback copy | **DOM-specific** — drop (RN has clipboard API) |
| 32 | `prompt(...)` for scenario name | **Trivially replaceable** → text input modal |

**Disposition:** Fully rewritten as RN components. Business logic (import flow, export flow) extracted to shared hooks/services.

### 1.4 `src/components/BattleField.tsx` — DOM Events (5 sites)

| Line | Usage | Classification |
|------|-------|----------------|
| 46-47 | `document.addEventListener('click', fn)` | **DOM-specific** — modal backdrop (rewrite) |
| 52-53 | `document.addEventListener('click', fn)` | **DOM-specific** — overlay dismiss (rewrite) |
| 459 | `window.confirm(...)` | **Trivially replaceable** → `Alert.alert()` |

**Disposition:** Fully rewritten as RN components. Uses `TouchableWithoutFeedback` or `Pressable` for backdrop instead of global document listeners.

### 1.5 `src/components/ExportPanel.tsx` — Portal + Clipboard + Download + Coach (14 sites)

| Line | Usage | Classification |
|------|-------|----------------|
| 2 | `import { createPortal } from 'react-dom'` | **DOM-specific** → RN `Modal` component |
| 29 | `localStorage.getItem(COACH_SESSION_KEY)` | **Must-abstract** → AsyncStorage |
| 38 | `localStorage.setItem(COACH_SESSION_KEY, ...)` | **Must-abstract** → AsyncStorage |
| 46 | `localStorage.removeItem(COACH_SESSION_KEY)` | **Must-abstract** → AsyncStorage |
| 66 | `navigator.clipboard.writeText(stateText)` | **Trivially replaceable** → `expo-clipboard` |
| 69-74 | `document.createElement('textarea')` fallback | **DOM-specific** → drop |
| 162-167 | `document.createElement('a')` file download | **DOM-specific** → `expo-sharing` or `expo-file-system` |
| 261 | `document.body` (portal target) | **DOM-specific** → RN `Modal` |

**Disposition:** Fully rewritten. Coach HTTP client (fetch calls to localhost:9000) moves to shared service. Clipboard/download logic becomes RN-native.

### 1.6 `src/services/pokemonTcgApi.ts` — API Cache (4 sites)

| Line | Usage | Classification |
|------|-------|----------------|
| 72 | `localStorage.getItem(CACHE_KEY)` | **Must-abstract** — API card cache |
| 83 | `localStorage.setItem(CACHE_KEY, ...)` | **Must-abstract** — API card cache |
| 200 | `localStorage.getItem(TCGDEX_CACHE_KEY)` | **Must-abstract** — TCGdex cache |
| 211 | `localStorage.setItem(TCGDEX_CACHE_KEY, ...)` | **Must-abstract** — TCGdex cache |

**Abstraction approach:** Same `StorageAdapter` as the store. The `getCache()`/`setCache()`/`getTcgdexCache()`/`setTcgdexCache()` functions become async and accept the adapter. Since the caller (`parseDeckListWithApi`) is already async, this is a straightforward change.

**Note on `fetch`:** Both APIs use standard `fetch()`. React Native's `fetch` is compatible — no changes needed for the HTTP calls themselves. `AbortSignal.timeout()` may need a polyfill for older RN versions (available in modern Hermes).

### 1.7 Files with ZERO DOM Coupling (confirmed)

- `src/types/index.ts` — pure type definitions
- `src/services/stateExporter.ts` — pure functions, imports `cardDatabase` (data)
- `src/services/stateImporter.ts` — pure functions, no external deps beyond `uuid`
- `src/services/promptGenerator.ts` — pure functions, only `DeckPreset` type
- `src/data/decks.ts` — pure data + `parseDeckList()` synchronous parser
- `src/data/cards.generated.ts` — static data (auto-generated)
- `src/components/PokemonCard.tsx` — pure rendering component (uses `memo`, `energyColors`)
- `src/components/ScenarioEditor.tsx` — React components only, no DOM APIs

---

## 2. Zustand Store → localStorage Coupling

### Architecture

The store uses **no middleware** for persistence. Instead:

1. **Startup read:** Module-level `loadAutoSave()` function (line 71) calls `localStorage.getItem()` synchronously at import time. Result feeds the `create()` initial state.

2. **Runtime write:** `useGameStore.subscribe()` (line 625) fires after every state change and calls `localStorage.setItem()` synchronously.

3. **Manual writes:** `addCustomDeck`, `removeCustomDeck`, `loadCustomDecks`, `saveScenario`, `deleteScenario` each call `localStorage.setItem`/`getItem` inline within their action bodies.

### Migration Requirements

- **StorageAdapter interface:**
  ```typescript
  interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }
  ```
- **Store factory:** `createGameStore(adapter: StorageAdapter)` instead of bare `create()`
- **Async init:** The module-level `loadAutoSave()` must become `await adapter.getItem(...)` — the store needs an async hydration step before first render.
- **Subscribe write:** The `subscribe()` callback becomes async (Adapter.setItem returns Promise). This is fine — Zustand subscribe is fire-and-forget.

### LocalStorage Keys

| Key | Purpose | Read Sites | Write Sites |
|-----|---------|-----------|-------------|
| `pokemon-autosave` | Game state + decks auto-save | `loadAutoSave()` (line 75), subscribe (line 625) | subscribe (line 625) |
| `pokemon-custom-decks` | User-created deck presets | `loadCustomDecks()` (line 206) | `addCustomDeck` (192), `removeCustomDeck` (200), `main.tsx` (13-14) |
| `pokemon-scenarios` | Saved game scenarios | `saveScenario` (563), `deleteScenario` (581) | same |
| `pokemon-data-version` | Data format version for migrations | `main.tsx` (11) | `main.tsx` (15) |
| `pokemon_tcg_cache` | Pokemon TCG API response cache | `getCache()` | `setCache()` |
| `tcgdex_cache` | TCGdex API response cache | `getTcgdexCache()` | `setTcgdexCache()` |
| `pokemon-coach-session` | Coach analysis session state | `loadCoachSession()` | `saveCoachSession()`, `clearCoachSession()` |

---

## 3. External API Surface

### 3.1 Pokemon TCG API (`pokemontcg.io`)

- **URL:** `https://api.pokemontcg.io/v2/cards`
- **Proxy:** None — direct client-side fetch. No Cloudflare Worker involved (wrangler.jsonc has only `assets` config, no routes/bindings).
- **Rate limits:** Free tier = 20,000 requests/day. Code implements exponential backoff (1.5s, 3s, 6s) on 429/404. Also adds 100ms delay between sequential requests in `fetchDeckCards()`.
- **CORS:** The API supports CORS — works in browsers. In RN, no CORS issues (no browser policy).
- **Auth:** No API key used. Free tier is unauthenticated.
- **Cache:** Client-side localStorage cache with 24h TTL. Two separate caches: `pokemon_tcg_cache` (primary API) and `tcgdex_cache` (fallback).
- **AbortSignal.timeout:** Used for 8s timeout. RN's `AbortSignal.timeout()` is available in modern Hermes (Expo SDK 50+).

### 3.2 TCGdex API (`tcgdex.net`) — Fallback

- **URL:** `https://api.tcgdex.net/v2/en`
- **Usage:** Called only when Pokemon TCG API fails to find a card.
- **Rate limits:** More permissive, no explicit handling.
- **Same cache/timeout pattern as above.**

### 3.3 Coach Server (`localhost:9000`)

- **URL:** Configurable via `VITE_COACH_URL`, defaults to `http://localhost:9000`.
- **Nature:** Local development tool (Python server at `scripts/coach-server.ts`). Not deployed to Cloudflare.
- **Migration note:** The coach feature needs either (a) a mobile-accessible server URL, or (b) disabled for mobile MVP. The `import.meta.env.VITE_COACH_URL` becomes `expo-constants` extra or `.env` via `expo-constants`.

---

## 4. Configuration & Bootstrap Surface

### 4.1 `public/` Directory

- Cloudflare SPA config only — no static assets referenced in code (no favicon, no manifest).
- The `assets.not_found_handling: "single-page-application"` in wrangler.jsonc is Cloudflare-specific.

### 4.2 `main.tsx` Bootstrap Flow

1. Data version check (localStorage migration)
2. Vite HMR hot-reload guard (`import.meta.hot`)
3. `beforeunload` warning
4. `createRoot(document.getElementById('root'))` → render `<App />`

**Expo equivalent:**
1. AsyncStorage data version check (same logic, async)
2. No Vite HMR equivalent needed
3. No `beforeunload` — RN app lifecycle handles this
4. `registerRootComponent(App)` or expo-router entry

### 4.3 Assets

- **CSS:** Two CSS files (`index.css`, `App.css`) — not included in shared core. Fully replaced by React Native `StyleSheet`.
- **Images:** No images referenced in `src/`. Pokemon card images come from API (`card.imageUrl`/`card.images.large`). These URLs work in RN `<Image>`.
- **Fonts:** No custom fonts — system fonts only.
- **Generated data:** `cards.generated.ts` (~6300 lines, ~100KB) — must ship in the app bundle. This is the largest single file.

### 4.4 Environment Variables

| Variable | Usage | Expo Equivalent |
|----------|-------|-----------------|
| `VITE_COACH_URL` | Coach server URL | `EXPO_PUBLIC_COACH_URL` or app.json extra |
| `import.meta.hot` | Vite HMR detection | Not needed |

---

## 5. Dependencies — Compatibility Assessment

| Dependency | Web | RN Compatible? | Notes |
|-----------|-----|---------------|-------|
| `react` 19.2 | ✅ | ✅ | Same package |
| `react-dom` 19.2 | ✅ | ❌ | Not used in RN — remove from shared core |
| `zustand` 5.0 | ✅ | ✅ | Works identically in RN |
| `uuid` 13.0 | ✅ | ✅ | Pure JS, no DOM |
| `react-markdown` 10.1 | ✅ | ⚠️ | Needs `react-native-markdown-display` or similar |
| `remark-gfm` 4.0 | ✅ | ⚠️ | Paired with markdown renderer replacement |

**Key insight:** `react-markdown` and `remark-gfm` are only used in `ExportPanel.tsx` for rendering coach results. They don't belong in the shared core — they're web UI dependencies.

---

## 6. File Disposition Table

### 6.1 Shared Core Package (`@pokemon-simulator/core`)

These files move to a shared package with **zero changes** (or minimal adapter injection):

| File | Changes Needed | Risk |
|------|---------------|------|
| `src/types/index.ts` | None | None |
| `src/services/stateExporter.ts` | None | None |
| `src/services/stateImporter.ts` | None | None |
| `src/services/promptGenerator.ts` | None | None |
| `src/data/decks.ts` | Remove `console.log`/`console.error` (or keep) | None |
| `src/data/cards.generated.ts` | None (static data) | None |
| `src/data/decks.test.ts` | None (test file) | None |
| `src/services/stateExporter.test.ts` | None (test file) | None |
| `src/services/stateImporter.test.ts` | None (test file) | None |
| `src/services/promptGenerator.test.ts` | None (test file) | None |

### 6.2 Shared Core — Needs Abstraction Layer

| File | Changes Needed | Risk |
|------|---------------|------|
| `src/store/gameStore.ts` | Inject `StorageAdapter`, make store factory async, extract `loadAutoSave` to accept adapter | **HIGH** — module-level sync init |
| `src/services/pokemonTcgApi.ts` | Inject `StorageAdapter` into `getCache`/`setCache`/`getTcgdexCache`/`setTcgdexCache`. Make functions async. | **MEDIUM** — already async callers |

### 6.3 Web-Only (keep as-is for web app)

| File | Why Web-Only |
|------|-------------|
| `src/main.tsx` | Vite bootstrap, react-dom, beforeunload |
| `src/App.tsx` | Web UI structure, browser APIs |
| `src/components/BattleField.tsx` | HTML events, CSS classes, document listeners |
| `src/components/ExportPanel.tsx` | react-dom portal, react-markdown, document API |
| `src/components/ScenarioEditor.tsx` | Web UI (CSS-class-based) |
| `src/components/PokemonCard.tsx` | Web UI (CSS-class-based, but simple enough to port) |
| `src/index.css` | CSS |
| `src/App.css` | CSS |
| `src/vite-env.d.ts` | Vite types |

### 6.4 React Native — New Files (mobile rewrite)

| New File | Replaces | Notes |
|----------|---------|-------|
| `app/_layout.tsx` | `main.tsx` | expo-router layout |
| `app/(tabs)/index.tsx` | `App.tsx` | Main game screen |
| `components/GameBoard.tsx` | `BattleField.tsx` | RN game board |
| `components/PokemonCardView.tsx` | `PokemonCard.tsx` | RN card component |
| `components/DeckSelectorModal.tsx` | Part of `BattleField.tsx` | Modal deck picker |
| `components/ExportPanelView.tsx` | `ExportPanel.tsx` | RN export screen |
| `components/ScenarioEditorView.tsx` | `ScenarioEditor.tsx` | RN editor |
| `components/StorageProvider.tsx` | — | Context for StorageAdapter |
| `lib/storage.ts` | — | AsyncStorage adapter impl |
| `lib/clipboard.ts` | — | expo-clipboard wrapper |
| `hooks/useStorage.ts` | — | Hook for hydration state |

---

## 7. Key Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Store module-level sync `localStorage` init | **HIGH** | Async hydration pattern: render skeleton → hydrate → render real app. Zustand supports `skipHydration` + manual rehydrate. |
| 100KB+ `cards.generated.ts` in bundle | **MEDIUM** | Ship as-is in JS bundle initially. Later: lazy-load from bundled JSON asset or SQLite. |
| Coach server unreachable from mobile | **MEDIUM** | MVP: disable coach on mobile. Later: deploy coach as Cloudflare Worker or use a remote URL. |
| `react-markdown` no RN equivalent | **LOW** | Only used for coach results. Use `react-native-markdown-display` or render as `<Text>`. |
| `AbortSignal.timeout()` on older Hermes | **LOW** | Polyfill with `setTimeout` + `AbortController` if needed. |

---

## 8. Recommended Migration Strategy

1. **Extract shared core** (`@pokemon-simulator/core`) — types, services, data, store (with adapter pattern)
2. **Storage adapter abstraction** — single `StorageAdapter` interface solves all 7 localStorage key sites
3. **Async store hydration** — convert module-level sync init to async pattern
4. **Expo project scaffold** — `create-expo-app`, install deps, set up expo-router
5. **Port game board** — start with GameBoard + PokemonCardView as first screen
6. **Port deck selector** — modal-based deck picker with API integration
7. **Port export/coach** — lowest priority, can be deferred

---

## Next Recommended Phase

**`sdd-propose`** — Formalize the proposal with: monorepo structure (turborepo/nx), shared core package boundaries, Expo project structure, first-slice scope (likely: game board view + deck selector + autosave).
