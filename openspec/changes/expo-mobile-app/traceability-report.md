# Spec Traceability Report + Aggregate Gate — `expo-mobile-app` (S5.3)

> **Phase:** sdd-apply Slice 5 (verification sweep) · **Branch:** `chore/expo-acceptance` off `8ac887f` (PR 5)
> **Aggregate gate at HEAD:** `npm test` **18 files / 224 tests, exit 0** (core + web + mobile workspaces) · `npx tsc -b` clean across all 3 workspaces · web `npm run build` green · web `wrangler deploy --dry-run` smoke OK · mobile `expo export --platform ios` green.
> **Coverage note:** the SDD task text says "20 spec requirements (A-1…N-1)"; the spec actually enumerates **32 numbered requirements** (A×5, B×4, C×6, D×4, E×4, F×3, G×2, H×3, N×1). All 32 are mapped below.

## Requirement → evidence map

### A — Repository & Workspace

| Req | Evidence | Status |
|-----|----------|--------|
| **A-1** npm workspaces monorepo (core/web/mobile) | Root `package.json` `"workspaces": ["packages/*","apps/*"]`; `vitest.workspace.ts` aggregates all 3; `npm test`/`tsc -b`/`npm run build` resolve across workspaces at HEAD | ✅ VERIFIED |
| **A-2** npm package manager of record; single `package-lock.json` | `bun.lock` deleted (slice 1); committed `package-lock.json` regenerated; all scripts `npm run` | ✅ VERIFIED |
| **A-3** Shared strict TS config, no workspace disables | `tsconfig.base.json` (`strict`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`) inherited by core/web/mobile; `npx tsc -b` clean | ✅ VERIFIED |
| **A-4** One root test entrypoint | `npm test` → vitest workspace aggregation, exit 0 | ✅ VERIFIED |
| **A-5** Web stays independently deployable | `npm run build` green at HEAD → `apps/web/dist` (307 modules, `index-BZDi2R11.js` 2,855.31 kB + unchanged `index-ZIy-rXDp.css`); `wrangler deploy --dry-run` reads 9 dist assets, exits clean (no deploy performed). Behavior parity: store/import/export/scenario flow through the same core modules as pre-change; churn across slices confined to tracked refactors (async hydration S2.11, coach adapter S2.12) | ✅ VERIFIED (build+smoke) · runtime play parity = dev-mode manual (`sdd-verify`/S5.1 web manual) |

### B — Shared core

| Req | Evidence | Status |
|-----|----------|--------|
| **B-1** Core with zero-change modules + 7 colocated suites move | 6 original suites moved unchanged (slice 1, rename-detected); `stateExporter/stateImporter/promptGenerator/decks` still green at HEAD | ✅ VERIFIED (regression net) |
| **B-2** Store + API move with adapter injection; no duplicate logic in `apps/web` | `gameStore`/`pokemonTcgApi` live in `packages/core/src`; web consumes via `@pokemon-simulator/core`; `apps/web/src/store` **absent**; only `lib/gameStore.ts` singleton (instance binding, zero logic — inspection at HEAD) | ✅ VERIFIED (inspection + tests) |
| **B-3** Core public surface platform-agnostic (no DOM/renderer) | Static scan at HEAD: `localStorage\|AsyncStorage` in core non-test sources → **only the contract doc comment** in `storage/types.ts:5`; `window\|document` → **zero matches**; `react-dom\|react-markdown\|remark-gfm` → **zero matches**. Barrel (S2.13) re-exports types/storage/store/hydrate/state fns/importer/promptGenerator **only**; `pokemonTcgApi`/`decks` stay under subpaths (R7) | ✅ VERIFIED (scan) |
| **B-4** ~100KB card DB ships as-is in both bundles | iOS Hermes export at HEAD contains `cards.generated` (sourcemap hit); web bundle includes it (2,855 kB total); preset decks render path unit-tested (`deckUtils.test.ts`) | ✅ VERIFIED (bundle) · on-device load = deferred leg |

### C — Persistence & hydration

| Req | Evidence | Status |
|-----|----------|--------|
| **C-1** Single async `StorageAdapter`; all 7 keys through it | `storage/types.ts` contract + frozen `STORAGE_KEYS` (7 keys, incl. `pokemon-coach-session`); **S2.12 completes the 7th key**: `apps/web/src/lib/coachSession.ts` persists the coach session through `webStorage`. Scan: only real `localStorage` site in web is `apps/web/src/lib/storage.ts`; core zero code refs | ✅ VERIFIED (scan + 7 new unit tests `coachSession.test.ts`) |
| **C-2** One adapter per platform, async-safe | Web: `apps/web/src/lib/storage.ts` (Promise-based, no import-time access) + 7 conformance tests · Mobile: `apps/mobile/src/lib/storage.ts` (AsyncStorage) + 7 conformance tests · Core in-memory: `createInMemoryStorage` + 11 tests | ✅ VERIFIED (unit) |
| **C-3** Explicit async hydration before render; no module-load storage | Web `main.tsx` skeleton → `hydrate` → render; mobile `_layout.tsx` gate; store factory never touches the adapter at import (C-3 unit case in `gameStore.test.ts`) | ✅ VERIFIED (unit + code inspection) |
| **C-4** Async tolerant idempotent migration in core | `migrate.test.ts` (6): version-absent, stale upgrade w/o loss, malformed never throws + stale-key removal, idempotency; `hydrate.test.ts` malformed autosave case | ✅ VERIFIED (unit) |
| **C-5** Async autosave + manual action persistence | `gameStore.test.ts` (38): autosave subscription, async `addCustomDeck`/`removeCustomDeck`/`loadCustomDecks`/`saveScenario`/`deleteScenario` await adapter writes · web S2.12 adds async coach save/clear | ✅ VERIFIED (unit) |
| **C-6** Empty-storage first-run clean state | `hydrate.test.ts` clean-default case; first-boot playable (empty state) in core suites | ✅ VERIFIED (unit) |

### D — Mobile shell & navigation

| Req | Evidence | Status |
|-----|----------|--------|
| **D-1** Expo + expo-router, exactly 4 tab surfaces, board default | 4 routes exported in iOS bundle at HEAD; `_layout.tsx` `<Tabs>` with `index` (Tablero) first | ✅ VERIFIED (bundle) · tab interaction deferred (device) |
| **D-2** Hydration gate; resume no double-init | Skeleton gate in shell; shared hydration promise (`storage-provider.tsx`); core idempotency test | ✅ VERIFIED (unit) · resume deferred (device) |
| **D-3** No coach on mobile; web coach unchanged | Scan: coach in mobile sources = 1 comment only. Web: ExportPanel coach UI intact (D-3 web leg), now persisting via adapter (S2.12) | ✅ VERIFIED (scan) |
| **D-4** Native replacements for browser APIs | `Alert`/`Modal`/`Pressable`/`expo-clipboard`/`expo-sharing`; `navigator.clipboard`/`document.createElement` only in comments | ✅ VERIFIED (scan + unit) |

### E — Gameplay UI

| Req | Evidence | Status |
|-----|----------|--------|
| **E-1** Full board parity via shared core rules | GameBoard + edit sheet drive only core `gameStore` actions; `boardState.test.ts` (12) + `deckUtils.test.ts` (16) cover helpers; mobile board mirrors web semantics (side-wide energy, damage ±10) | ✅ VERIFIED (unit) · on-device interaction deferred |
| **E-2** Exact autosave/restore across relaunch (both platforms) | Core hydrate restore + autosave-restore unit cases; adapter conformance both platforms | ✅ VERIFIED (unit) · **device legs deferred — runtime absent** (acceptance-matrix.md #3/#4) |
| **E-3** Deck presets + custom CRUD persists | Deck browser tab + `deckUtils.test.ts`; persistence via core C-5 cases | ✅ VERIFIED (unit) · on-device restart deferred |
| **E-4** Large deck tolerance; 100ms pacing; cache-first | `pokemonTcgApi.test.ts` (25) incl. pacing/backoff/TTL cases; imports cache-first (E-4) | ✅ VERIFIED (unit) · on-device responsiveness deferred |

### F — Import/export

| Req | Evidence | Status |
|-----|----------|--------|
| **F-1** Clipboard + share export, identical text | `clipboard.test.ts` (2) + `importExport.test.ts` `buildExportMarkdown` (same core `stateExporter` structure as web) | ✅ VERIFIED (unit) · share-sheet presentation deferred |
| **F-2** Import round-trip equality | `importExport.test.ts` round-trip, valid/malformed cases via shared core `importStateFromJson` | ✅ VERIFIED (unit) |
| **F-3** Scenario save/load/delete persists | `scenarioWiring.test.ts` (7) + core `hydrate.test.ts` scenario read-back (R5 fix) | ✅ VERIFIED (unit) · on-device relaunch deferred |

### G — External API

| Req | Evidence | Status |
|-----|----------|--------|
| **G-1** Resolution w/ backoff, pacing, timeout, 24h TTL cache | Core `pokemonTcgApi.test.ts` (25) — cache round-trip/expiry/persistence, backoff/pacing logic preserved; 8s timeout works under Hermes (AbortSignal.timeout, SDK 57) | ✅ VERIFIED (unit) |
| **G-2** Offline tolerance end-to-end | All gameplay/autosave/deck/scenario persistence adapter-only (no network); external lookups cache-first with graceful failure | ✅ VERIFIED (unit) · **airplane-mode device leg deferred** |

### H — Tests & H-1/H-2/H-3

| Req | Evidence | Status |
|-----|----------|--------|
| **H-1** 7 original suites intact + new storage/hydration/migration tests in core workspace | Originals green; new: `storage/types.test.ts` (11), `migrate.test.ts` (6), `hydrate.test.ts` (11), web `storage.test.ts` (7), **`coachSession.test.ts` (7, S2.12)** | ✅ VERIFIED (aggregate `npm test`, exit 0) |
| **H-2** Strict TDD RED→GREEN for core + web behavior changes | Every behavior slice landed RED→GREEN (slices 2–4 records + **S2.12 RED: suite failed `Cannot find module './coachSession'` → GREEN: 7/7** — TDD table below) | ✅ VERIFIED (records) |
| **H-3** Mobile unit-only, no second framework | Mobile vitest: storage/clipboard/deckUtils/boardState/importExport/scenarioWiring (7+2+16+12+6+7 = 50 tests); no jest-expo; UI acceptance deferred to device per matrix | ✅ VERIFIED |

### N — Non-functional

| Req | Evidence | Status |
|-----|----------|--------|
| **N-1** Startup + bundle sanity; no startup/memory regression (measured) | Bundle sanity VERIFIED (Hermes export + web build at HEAD); **cold-start time/memory measurement DEFERRED** — no simulator runtime (acceptance-matrix.md #10) | ⏳ DEFERRED (device/CI measurement) |

## TDD Cycle Evidence — Slice 5 (S2.12, the only behavior change this slice)

| Cycle | RED (failing) | GREEN (passing) | Refactor |
|-------|---------------|-----------------|----------|
| Coach session via web adapter (7th key) | `apps/web/src/lib/coachSession.test.ts` — suite failed `Cannot find module './coachSession'` (1 file / 0 tests) | `coachSession.test.ts` 7/7 + `storage.test.ts` 7/7 (14/14 in one run); full `npm test` 18 files / 224 tests | `ExportPanel.tsx` moved persistence to `lib/coachSession.ts` over `webStorage`; session restore now async (C-2) with explicit re-check of restored pending ids; `apps/web/vite.config.ts` alias limitation surfaced (value import from `@pokemon-simulator/core/storage` → directory) — solved by importing `STORAGE_KEYS` from the root barrel instead (web build green) |

## Aggregate gate verdict

| Gate | Result at HEAD |
|------|----------------|
| `npm test` (core + web + mobile) | ✅ **18 files / 224 tests, exit 0** (baseline 17/217 → +7 slice-5 coach-session tests) |
| `npx tsc -b` (3 workspaces) | ✅ clean |
| `npm run build` (web → deployable dist) | ✅ `dist/assets/index-BZDi2R11.js` (2,855.31 kB, gzip 398.83 kB) + unchanged CSS; 307 modules |
| `wrangler deploy --dry-run` | ✅ config + 9 dist assets validated; **no deploy performed** (no approval requested) — credentials ARE present (OAuth, logged in) |
| `expo export --platform ios --dump-sourcemap` | ✅ Hermes bundle `entry-2496099f….hbc` 3.3MB (+9.7MB map) at HEAD |
| Static scans (SC7/B-3/D-3/D-4/B-2) | ✅ clean (details above) |

**Aggregate acceptance verdict:** the change is **implementation-complete and unit/bundle/scan-verified**. What passes now: all 32 spec requirements at unit/bundle/scan level (aggregate gate green). What is deferred: the **device-runtime legs** of D-1/D-2, E-2 (kill-and-relaunch), E-3/E-4, F-1 (share sheet), G-2 (airplane mode), and **N-1 measurement** — all blocked by the absence of any iOS runtime/Android emulator in this environment (proven in acceptance-matrix.md). These map to `sdd-verify` on a real simulator/emulator or a CI device lane.

## Residual risk disposition (design R1–R11)

| Risk | Disposition at HEAD |
|------|---------------------|
| R1 workspace restructure breaks web deploy | ✅ cleared — web build + dry-run smoke green every slice; hashes recorded |
| R2 module-load sync → async hydration | ✅ cleared — factory + hydrate + gates; tests |
| R3 Metro monorepo resolution | ✅ cleared — sourcemap proves core sources in bundle |
| R4 bun-only script syntax | ✅ cleared — node-runnable since slice 1 |
| R5 scenario write-only persistence | ✅ cleared — hydrate read-back (S2.6) + tests |
| R6 resetGame drift | ✅ cleared — hydrated-decks restore, tested |
| R7 CardData collision | ✅ cleared — subpath namespacing, barrel omits both |
| R8 ~100KB DB in bundle | ⏳ bundle sanity ✅; **cold-start measurement OPEN** (N-1, deferred to device/CI) |
| R9 async autosave ordering | ✅ cleared — last-write-wins per key; no data-loss observed in tests |
| R10 AbortSignal.timeout on Hermes | ✅ SDK 57 Hermes; fallback path documented, not required |
| R11 coach unreachable / react-markdown on mobile | ✅ non-goal honored — no coach on mobile (D-3 scan) |

## Open items handed to `sdd-verify`

1. Device-runtime acceptance (matrix items 1–6, 8–11 device legs): iOS Simulator + Android emulator kill-and-relaunch, airplane-mode, share sheet, cold-start measurement.
2. Web manual runtime parity (S5.1 web leg): start game → reload restore → import/export → scenario save in a real browser (dev-mode smoke; build/unit evidence provided here).
3. tasks.md S5.2 row intentionally left `- [ ]` (not genuinely verifiable here) — evidence ledger above.