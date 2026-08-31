# Proposal: Expo Mobile App (iOS/Android)

> **Change:** `expo-mobile-app`
> **Date:** 2025-07-18
> **Status:** Proposed
> **Input:** `openspec/changes/expo-mobile-app/explore.md` (authoritative scope source)

## 1. Intent

Take the pokemon-simulator to iOS and Android by building a React Native + Expo app that **shares the existing TypeScript core** (types, services, data, store logic) with the existing web SPA, instead of duplicating logic in a parallel codebase. This proposal defines the first slice (MVP), the target repo structure, and the architecture decisions that make the core platform-agnostic: a shared `@pokemon-simulator/core` package, a `StorageAdapter` abstraction, and async store hydration.

The core-periphery split is already clean (verified in exploration): 10 files are pure TypeScript with zero DOM coupling; all browser coupling is concentrated in 6 files that fall into two categories — localStorage persistence (solvable with one abstraction) and DOM-specific UI (rewritten as RN components).

## 2. Problem & Opportunity

**Problem today:** The simulator is web-only. Playing it requires a desktop browser session; there is no way to run a battle at a table, on the couch, or offline-first on a phone. All persistence is browser-local (7 localStorage keys), so there is no path to a mobile experience without first removing the DOM coupling from the core.

**Opportunity:** The domain logic is framework-agnostic. A single extraction effort — moving pure-TS files to a shared package and introducing a storage adapter — unlocks a native app while *improving* the web app (clearer boundaries, testable persistence, async-safe hydration) and keeping one source of truth for rules, deck data, and state import/export.

**Product outcome:** A player can install/run the simulator on iOS and Android, play the same scenarios with the same decks, autosave locally on device, import/export game state, and browse/buy decks via the existing card APIs — with rule logic identical to the web app because it is the same code.

## 3. Scope — First Slice (MVP)

### 3.1 What the mobile app must do (MVP)

1. **Play simulator scenarios** — full game board (active/bench Pokemon, HP, energy, status, hand, discard, prizes, deck), same interactions as the web app: start game, place Pokemon from deck, add/remove energy, add damage, set status, swap players, reset, autosave/restore on device relaunch.
2. **Import/export game state** — export to markdown/text via `expo-clipboard` (and file/share via `expo-sharing`), import from clipboard; scenario save/load/delete.
3. **Browse decks** — built-in presets from core data plus custom deck CRUD (persisted via AsyncStorage); fetch card images and resolve external deck lists through the existing `pokemonTcgApi` service (pokemontcg.io primary, tcgdex.net fallback) with the existing cache + backoff logic.
4. **Parity of rules, not UI** — the core `gameStore` and services are literally the same code; the mobile UI is a mobile-first redesign (not a pixel port) and replaces `window.confirm`/`prompt` with `Alert`/modals and clipboard DOM hacks with `expo-clipboard`.

### 3.2 Target repo structure

```
pokemon-simulator/
├── package.json                  # npm workspaces root (see §5.3)
├── tsconfig.base.json            # shared strict TS config
├── vitest.workspace.ts           # aggregates core + web tests
├── packages/
│   └── core/                     # @pokemon-simulator/core — shared TS
│       ├── src/
│       │   ├── types/index.ts            # zero-change move
│       │   ├── data/decks.ts             # zero-change move
│       │   ├── data/cards.generated.ts   # zero-change move (~100KB, ships in bundle)
│       │   ├── services/stateExporter.ts # zero-change move
│       │   ├── services/stateImporter.ts # zero-change move
│       │   ├── services/promptGenerator.ts # zero-change move
│       │   ├── services/pokemonTcgApi.ts # StorageAdapter injection; async cache fns
│       │   ├── store/gameStore.ts        # StorageAdapter factory + async hydration
│       │   └── storage/types.ts          # StorageAdapter interface + in-memory test impl
│       └── (tests move with their sources: decks.test.ts, stateExporter.test.ts,
│             stateImporter.test.ts, promptGenerator.test.ts, gameStore.test.ts,
│             pokemonTcgApi.test.ts, decks.async.test.ts)
├── apps/
│   ├── web/                      # existing Vite SPA (react-dom UI stays here)
│   │   ├── src/                  # main.tsx, App.tsx, components/, *.css, vite-env.d.ts
│   │   ├── vite.config.ts, index.html, wrangler.jsonc (deploy config stays web-scoped)
│   └── mobile/                   # Expo app (new)
│       ├── app/_layout.tsx       # expo-router layout (replaces main.tsx)
│       ├── app/(tabs)/index.tsx  # main game screen (replaces App.tsx)
│       ├── components/           # GameBoard, PokemonCardView, DeckSelectorModal,
│       │                         # ExportPanelView, ScenarioEditorView, StorageProvider
│       ├── lib/storage.ts        # AsyncStorage adapter (web adapter lives in apps/web)
│       ├── lib/clipboard.ts      # expo-clipboard wrapper
│       └── hooks/useStorage.ts   # hydration gate hook
├── scripts/                      # coach-server.ts, fetch-cards.ts (unchanged)
└── (existing web-only files stay web-only: BattleField.tsx, ExportPanel.tsx,
    ScenarioEditor.tsx, PokemonCard.tsx, main.tsx, App.tsx, *.css)
```

**Web app keeps its full current behavior**; it only changes mechanically: files with zero coupling move out to `packages/core` and import paths update to `@pokemon-simulator/core`, and the store/API services are consumed through the adapter factory.

## 4. Non-Goals (out of scope for this change)

- **No coach feature on mobile.** `localhost:9000` is unreachable from a device and there is no deployed coach server. The mobile app hides/disables coach UI for MVP; web keeps coach. (Follow-up: deploy coach as a Cloudflare Worker or remote URL.)
- **No multi-device sync / accounts.** Persistence stays local per device (AsyncStorage). No backend, no Cloudflare KV sync, no Apple/Google account setup in this phase.
- **No monetization** — no IAP, no paywalls.
- **No UI parity with the web app.** Mobile is a mobile-first redesign; CSS is not shared; `react-markdown`/`remark-gfm` are not ported (web-only coach rendering).
- **No card database optimization.** The ~100KB `cards.generated.ts` ships in the JS bundle as-is; lazy-loading from bundled JSON/SQLite is a later refinement.
- **No web-app feature changes** beyond the mechanical core extraction. No new web features, no visual changes to the SPA.
- **No CICD pipeline for app stores** — no Apple Developer/Google Play signing, TestFlight, or store submission in this phase (simulator/expo-go verification only).

## 5. Key Architectural Decisions

### 5.1 Extract `@pokemon-simulator/core` (shared package)

**Decision:** All 10 pure-TS files move to `packages/core` with zero behavioral changes; the two coupled files (`gameStore.ts`, `pokemonTcgApi.ts`) move with adapter injection. Web UI files stay in `apps/web`. Package exports only the public surface (store factory, services, types, data) — no DOM/renderer types leak.

**Rationale:** One source of truth for rules and data; both apps get identical behavior for free; the existing 7 test files move with their sources, so the current test suite doubles as the extraction regression net. `react-dom`, `react-markdown`, and CSS never enter core.

### 5.2 `StorageAdapter` abstraction (solves all 7 localStorage keys)

**Decision:** One async interface injected into everything that touches persistence:

```ts
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

Web implements it over `localStorage`; mobile implements it over `@react-native-async-storage/async-storage`. All 7 keys (`pokemon-autosave`, `pokemon-custom-decks`, `pokemon-scenarios`, `pokemon-data-version`, `pokemon_tcg_cache`, `tcgdex_cache`, `pokemon-coach-session`) flow through this boundary. Core ships an in-memory adapter for tests. An optional `delay`/sequence guard is considered for tests only.

**Rationale:** The exploration verified 16 concrete `localStorage` sites across 3 files; a single interface with two thin platform impls is strictly less code than parallel persistence forks. Async signature matches AsyncStorage natively and forces the web path to be async-safe too.

### 5.3 Async store hydration (highest-risk change)

**Decision:** Replace the module-level synchronous `loadAutoSave()` with an explicit async hydration step, keeping the custom persistence design (no `zustand/persist` middleware):

- `createGameStore(adapter)` factory instead of bare `create()`.
- `hydrate(store, adapter)` called once before first render: reads `pokemon-autosave`, `pokemon-custom-decks`, runs the data-version migration (moved out of `main.tsx` into core as async `migrateData(adapter)`), then seeds store state.
- The `subscribe()` autosave callback becomes async and fire-and-forget (Zustand tolerates this; ordering of rapid writes is last-write-wins per key — acceptable for MVP, flagged in §7).
- Manual CRUD actions (`addCustomDeck`, `removeCustomDeck`, `loadCustomDecks`, `saveScenario`, `deleteScenario`) become async and persist through the adapter.
- The hydration gate lives in the app shell: render skeleton → hydrate → render real app (`useStorage`/`StorageProvider` in mobile; an async bootstrap in web).

**Rationale:** The top exploration risk is module-level sync init; an explicit hydration step is the standard, testable resolution (same pattern Zustand recommends with `skipHydration`). Migrating to the `persist` middleware would be a bigger behavioral rewrite (single-key semantics vs. the app's multi-key, legacy-tolerant schema in `loadAutoSave`) for no MVP gain; the factory + hydrate approach keeps the existing schema and legacy-format tolerance intact.

### 5.4 Monorepo tooling: npm workspaces

**Decision:** npm workspaces (`"workspaces": ["packages/*", "apps/*"]`), vitest via a root `vitest.workspace.ts`, shared `tsconfig.base.json` with project references. `npm test` at root runs all workspace tests (Strict TDD: test command stays `npm test`).

**Rationale (and honest current-state flag):** The repo today installs with bun (`bun.lock` at root; `deploy`/`coach`/`update-cards` scripts call `bun run`). Session context fixes npm as the primary (package manager of record), so npm workspaces is the chosen structure. Migration impact: regenerate the lockfile (`package-lock.json` replaces `bun.lock`), and root scripts either switch `bun run build` → `npm run build` or keep bun purely as a script runner where convenient — the proposal requires a deliberate call here, surfaced in §6.2 and left to the tasks phase. (Alternative — bun workspaces — is viable but contradicts the primary-lockfile constraint.)

### 5.5 Expo SDK: latest stable with expo-router

**Decision:** Scaffold `apps/mobile` with the **latest stable Expo SDK** (SDK 53 as of this writing; New Architecture default; Hermes includes `AbortSignal.timeout`, so the 8s API timeouts work without polyfill) using the default **expo-router** file-based navigation template.

**Rationale:** expo-router matches the app's real structure — four distinct surfaces (game board, deck browser, export, scenario editor) map naturally to tabs/routes, and the exploration's own migration strategy already lays out `app/_layout.tsx` + `app/(tabs)/index.tsx`. A single-screen scaffold would need navigation added within one release anyway. SDK 53 (not bleeding-edge SDK 54 preview) for ecosystem stability. **Known integration cost:** Expo inside npm workspaces needs `metro.config.js` `watchFolders` + `nodeModulesPaths` so Metro resolves hoisted deps; this is standard and goes into design/tasks.

### 5.6 Test strategy across workspaces

- **`packages/core`:** existing 7 vitest suites move intact — they remain the behavioral contract; new tests for the `StorageAdapter` contract (in-memory adapter, web adapter vs. a `localStorage` mock, hydration order, migration) land here.
- **`apps/web`:** vitest keeps running web-scoped tests (if any remain after the move); `npm test` at root aggregates everything via `vitest.workspace.ts`.
- **`apps/mobile`:** unit-test only pure logic (which lives in core) plus the thin AsyncStorage adapter/wrapper under vitest with RN mocks. UI is verified in simulators (see §8), not by jsdom — avoids a second framework (jest-expo) for MVP. Escalate to jest-expo/maestro E2E as a follow-up if UI regressions recur.
- **Strict TDD:** core-first — storage abstraction and hydration logic are written test-first in `packages/core`; app shells are proven by the simulator acceptance criteria.

## 6. Tradeoffs & Impact

### 6.1 What changes for the existing web app

- **Import paths:** `../types`, `../services/*`, `../store/gameStore`, `../data/*` become `@pokemon-simulator/core` imports across `apps/web/src`.
- **Store consumption:** `useGameStore` becomes `createGameStore(webStorageAdapter)` + async hydrate with the data-version migration, replacing the synchronous module init in `main.tsx`. Startup has one new async step (skeleton → hydrate → render) — an intentional, small behavior change (no longer synchronous-at-import); autosave persistence becomes async write (fire-and-forget), invisible to gameplay.
- **`main.tsx` shrinks** to bootstrap-only (createRoot + hydration gate); Vite HMR/`beforeunload` guards stay web-only.
- **Tests:** the 7 core suites move to `packages/core`; CI-equivalent commands change from `npm test` (single package) to workspace-aware `npm test` at root.
- **Deploy:** web remains a static Cloudflare SPA (`wrangler.jsonc` unchanged in behavior); the monorepo restructure must keep `npm run build` producing the same deployable `dist`.

### 6.2 Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Module-level sync `localStorage` init → async hydration | **HIGH** | §5.3 factory + hydrate; skeleton gate; core tests for hydration order and legacy-format tolerance |
| Monorepo migration breaks web deploy pipeline (`bun.lock` → `package-lock.json`, workspace resolution) | **MEDIUM** | §5.4; web stays independently deployable at every commit; smoke-verify `npm run build` + wrangler deploy in tasks phase |
| ~100KB `cards.generated.ts` in mobile JS bundle | **MEDIUM** | Accepted for MVP (single static file, tree-shake-proof); measured at startup; lazy-load from JSON asset/SQLite later |
| Coach unreachable on device | **MEDIUM** | Non-goal for MVP; mobile UI omits coach; web unaffected |
| `AbortSignal.timeout()` on older Hermes | LOW | Available on SDK 53 Hermes; polyfill with `setTimeout` + `AbortController` fallback in core service if needed |
| Async autosave write ordering (rapid state changes) | LOW | Last-write-wins per key; AsyncStorage serializes per key; revisit with write-queue only if data loss observed |
| Expo-in-workspaces Metro resolution | LOW | `metro.config.js` watchFolders/nodeModulesPaths; verified during scaffold |

### 6.3 Edge cases

- **Offline:** API fetches fail through existing exponential backoff (1.5s/3s/6s); AsyncStorage cache still serves 24h-TTL data; autosave, custom decks, and scenarios are fully local and unaffected. App must boot and play with zero network.
- **First launch / version migration:** `pokemon-data-version` check must run before hydration (async, as today's sync logic); stale/malformed autosave is tolerated (never throws — preserved from `loadAutoSave`).
- **RN quirks:** `fetch` works natively but there is no browser CORS — do not rely on CORS behavior for correctness; `navigator.clipboard` replaced by `expo-clipboard`; `window.confirm`/`prompt` replaced by `Alert`/modals; `beforeunload` nonexistent (app-lifecycle handles it); `react-markdown` is not ported (coach-only).
- **Large deck lists / throttling:** existing 100ms sequential-request pacing and cache.apply on device too; prefer cached card data to avoid mobile data usage.
- **Rotation/backgrounding:** RN lifecycle suspends JS; hydration must be idempotent so a resumed app doesn't double-init or lose the in-flight game.

## 7. Success Criteria (measurable)

1. **Core tests green:** the 7 existing core suites pass unchanged after extraction, plus new StorageAdapter/hydration/migration tests — `npm test` (root, vitest) exits 0 across core and web workspaces.
2. **iOS simulator:** app boots in the iOS Simulator (Expo Go/dev build); game board renders; starting a game, autosaving, killing and relaunching the app restores the exact game state.
3. **Android emulator:** same acceptance on the Android emulator.
4. **Web unaffected:** `npm run build` + wrangler deploy still succeeds from the monorepo; web app plays identically (spot-check: start game, autosave reload restore, import/export, scenario save).
5. **Import/export on mobile:** export produces text via `expo-clipboard`; import restores an identical game state (round-trip equality, same core `stateExporter`/`stateImporter`).
6. **Deck browsing:** custom deck add/remove persists across app restarts (AsyncStorage); an external deck list resolves via pokemontcg.io with cache hit on second load (offline-safe).
7. **Storage boundary clean:** zero direct `localStorage`/`AsyncStorage` references inside `packages/core` outside the `StorageAdapter` impls; all 7 keys flow through the adapter.
8. **Bundle sanity:** app builds and the ~100KB cards file loads without runtime error; no new memory/startup regression measured in simulator.

## 8. Rollback

- **Web isolation:** the web app remains independently deployable at every commit. The core extraction is a mechanical move with tests as the net; if it stalls, web reverts to the pre-migration commit and deploys as today.
- **Additive mobile:** `apps/mobile` is purely additive — it never blocks or alters web deploys. Abandoning mobile costs nothing operationally.
- **Ordering safeguard:** do the monorepo restructure in its own review slice (mechanical move + green tests) *before* shipping web behavior changes (async hydration), so each slice is independently revertible and the two top risks never land in one PR.

## 9. Affected Areas

- `package.json`, `tsconfig*.json`, vitest config — workspace restructure
- `src/store/gameStore.ts`, `src/services/pokemonTcgApi.ts` — adapter injection + async changes (move to core)
- `src/types`, `src/data/*`, `src/services/{stateExporter,stateImporter,promptGenerator}.ts` — move to core (no change)
- `src/main.tsx` — data-version migration moves to core; bootstrap + hydration gate
- `apps/web/src/**` — import path updates; web-specific UI files unchanged
- `apps/mobile/**` — new Expo app
- `wrangler.jsonc` — unchanged (web-scoped); deploy scripts reviewed for `bun`/`npm` consistency
- Docs/scripts: `scripts/coach-server.ts`, `scripts/fetch-cards.ts` — unchanged location

## 10. Proposal Question Round (assumptions requiring user review)

Delegated auto-mode execution — I could not ask interactively. The orchestrator SHOULD run this round with the user before finalizing; each item names the assumption the proposal currently makes:

1. **MVP screen depth (scope):** is full gameplay parity (hand/discard/prizes/bench management) required in the first slice, or is a "playable core" (active Pokemon, HP, energy, status, autosave) the right cut? Assumption: full parity — the core is shared anyway; the cost is UI-writing, not logic.
2. **Export format on mobile:** clipboard-only for MVP, or must `expo-sharing` file export (share sheet / save to Files) be in the first slice too? Assumption: clipboard + share, both cheap via the two libs.
3. **Coach on mobile:** "hidden for MVP" (UI absent) vs. "disabled but present as disabled UI"? Assumption: absent — less surface, no dead UI; revisit with a deployed coach endpoint.
4. **bun → npm migration extent:** npm becomes the sole package manager (delete `bun.lock`, rewrite scripts) vs. npm for installs while keeping `bun run` for fast scripts? Assumption: npm primary end-to-end, per session context; the repo's current `bun.lock` is the migration cost.
5. **Mobile test depth:** unit tests limited to core + adapter impls with simulator-based UI acceptance (no jest-expo in MVP), vs. investing in jest-expo component tests now? Assumption: the former, keeping one vitest stack.

If any assumption is wrong, the affected section (§3, §4, §5, §6) must be corrected before spec/design proceed.

---

*Artifact store: openspec. Source inputs: explore.md (authoritative), package.json/tsconfig/main.tsx/gameStore.ts spot-checks. No project skills were injected into this delegation.*