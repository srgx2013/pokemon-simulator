# Apply Progress — `expo-mobile-app` (PR 1 / Slice 1: S1.1–S1.7)

> **Phase:** sdd-apply · **Change:** expo-mobile-app · **Store:** openspec (file-based)
> **Delivery:** stacked-to-main; PR 1 = Slice 1 whole; `size:exception` approved (rename-dominant + generated lockfile/scaffold)
> **Mode:** strict TDD active (`npm test`, vitest) — Slice 1 is **regression-only** per tasks.md; no RED phase (no new behavior).
> **Baseline:** main = `5b96807` (5b9680736617bab38cb16a9ac24e3bdd11701fe5), clean working tree at start.

## Structured status consumed

Parent prompt provided the running context for this slice; no `openspec/state.yaml` exists for this change (openspec store here is artifact-files only). Status fields produced by this phase:

- `applyState`: in-progress → completed for Slice 1 (PR 1)
- `dependencies`: none unmet — S1.1–S1.7 implemented in dependency order (S1.2 → after S1.1, etc.)
- `blockedReasons`: none
- `actionContext`: no workspace-planning mode; no `allowedEditRoots` restriction provided; edits confined to the repo root
- Skill resolution: `paths-injected` (work-unit-commits, chained-pr, branch-pr SKILL.md paths read before implementation)

## Completed tasks (checkbox updates in `tasks.md`)

| Task | Persisted checkbox | Verification |
|------|-------------------|--------------|
| S1.1 npm workspaces root + scripts → npm | `- [x]` (commit f2c95b8) | `npm install` reproducible from regenerated `package-lock.json`; `bun.lock` deleted |
| S1.2 `tsconfig.base.json` + thin root solution | `- [x]` (commit f2c95b8) | root `tsc -b` passes; no workspace disables strict flags |
| S1.3 core/web package skeletons + web shell move + `vitest.workspace.ts` | `- [x]` (commit 4df69b6) | `npm test` aggregates core+web; web build produces `apps/web/dist` |
| S1.4 7 pure sources + 6 test suites → `packages/core/src` | `- [x]` (commit 4df69b6) | 6 core suites pass unchanged (100% rename detection, zero content change) |
| S1.5 web sources → `apps/web/src` + imports → `@pokemon-simulator/core/*` | `- [x]` (commit 4df69b6) | full `npm test` (128 tests) + `npm run build` green |
| S1.6 CLI scripts node-runnable | `- [x]` (commit 2f30bf8) | `node scripts/fetch-cards.ts` executes; coach server smoke: /health, /analyze, /result under node |
| S1.7 eslint/.gitignore for workspaces | `- [x]` (commit f047843) | config restructured; **no new lint findings** (83 pre-existing, see Risks) |

## Files changed (by commit)

1. `f2c95b8 chore(expo): switch repo to npm workspaces with shared strict tsconfig`
   - `package.json` (workspaces `["packages/*","apps/*"]`; scripts → `npm run -w @pokemon-simulator/web`; `coach`/`coach:remote`/`update-cards` → `node scripts/*.ts`)
   - `bun.lock` deleted; `package-lock.json` regenerated (workspaces + lock entries)
   - `tsconfig.base.json` (new, shared strict); `tsconfig.json` (thin solution → `./packages/core`, `./apps/web`)
   - `tsconfig.app.json` / `tsconfig.node.json` deleted
   - `packages/core/{package.json,tsconfig.json,vitest.config.ts}` (new skeleton)
   - `apps/web/{package.json,tsconfig.json,vitest.config.ts}` (new skeleton)
2. `4df69b6 refactor(expo): extract shared core and relocate web app into workspaces`
   - `git mv` web shell: `index.html`, `public/*`, `wrangler.jsonc`, `src/{index.css,App.css,vite-env.d.ts,assets/*}` → `apps/web/…`
   - `git mv` 13 core files → `packages/core/src/{types,data,services}` (7 sources + 6 suites)
   - `git mv` web sources: `main.tsx`, `App.tsx`, `components/*`, `store/*` → `apps/web/src/…`
   - `git mv vite.config.ts` → `apps/web/vite.config.ts` (+ `resolve.alias` `@pokemon-simulator/core` → `packages/core/src`)
   - `vitest.workspace.ts` (new, `['packages/core','apps/web']`)
   - import rewrites in web sources → `@pokemon-simulator/core/{types,data/decks,services/stateImporter,services/promptGenerator,services/stateExporter}`
   - `tasks.md` checkboxes S1.1–S1.5 → `[x]`
3. `2f30bf8 chore(expo): make CLI scripts node-runnable with npm run scripts`
   - `scripts/fetch-cards.ts`: shebang → node; import → `../packages/core/src/services/pokemonTcgApi.ts`; output → `../packages/core/src/data/cards.generated.ts`; header comment updated
   - `scripts/coach-server.ts`: **Bun→Node translation** (see Deviations); shebang added; `import.meta.dir` → `import.meta.dirname`
   - `apps/web/src/components/ExportPanel.tsx`: coach error hint `(bun run coach)` → `(npm run coach)`
   - `packages/core/src/data/cards.generated.ts`: header comment bun→node only (content byte-identical)
   - `tasks.md` S1.6 → `[x]`
4. `f047843 chore(expo): scope eslint globals and ignore configs to workspaces`
   - `eslint.config.js`: scoped `globals.node` for `scripts/**/*.ts` + `packages/**/*.ts`; `globals.browser` for web; ignores `dist`
   - `.gitignore`: `apps/mobile/node_modules`, `.expo`, `ios`, `android`, keystore/provisioning files
   - `tasks.md` S1.7 → `[x]`

## Deviation log (from design.md / tasks.md)

1. **`scripts/coach-server.ts` full Bun→Node translation (scope addition).** Design §2a/task S1.6 named only shebang + `import.meta.dir` fixes, but the live file uses `Bun.serve` (module top-level), `Bun.spawn`, `Bun.spawnSync` — none exist under Node; the task's own smoke gate (`npm run coach` under node) is unreachable without translating them. Translated to `node:http` `createServer` + `node:child_process` `spawn`/`spawnSync`. Behavior preserved: same endpoints (`/health`, `/analyze`, `/result/:id`, `/inbox`), statuses, CORS headers, JSON shapes, console output, host/port env vars. Smoke-verified (health → analyze → result 404 → log lines).
2. **`fetch-cards.ts` full regeneration not committed (network-gated).** Ran `node scripts/fetch-cards.ts` under Node 26 — executes and fetches correctly (10 sets OK in the window), but the run was cut by a 120s timeout (transient API 500s on later sets) and the committed `cards.generated.ts` was restored **byte-identical** (only the header comment updated) to avoid partial-DB damage and behavior drift. Full regen remains `npm run update-cards` for maintainers with API access. Regeneration of the ~100KB file is a declared `size:exception`-style generated artifact when it changes.
3. **`vitest.workspace.ts` aggregates `['packages/core','apps/web']` (not the final 3-entry list).** `apps/mobile` does not exist in slice 1; vitest workspace projects for missing dirs fail. S3.1/S3.4 add the mobile project when it exists.
4. **`packages/core/tsconfig.json` adds `"lib": ["ES2023","DOM"]`** (design §2e said core stays DOM-free / `types: []`). `types: []` is inherited; the DOM lib is required in slice 1 only to type-check `pokemonTcgApi.ts`'s `localStorage`/`fetch`/`Response` stubs, which remain until S2.9 abstracts them (design §3.3: "moves unchanged in slice 1"). `types: []` stays; DOM lib can be dropped after S2.9 if desired. No `window`/`document` identifiers exist in core source text.
5. **`tsconfig.base.json` additions:** `"allowImportingTsExtensions": true` (required: web sources import `./App.tsx`; inherited from the deleted app config) and relative `./packages/...` `paths` values (TS5090: non-relative path substitutions are illegal without `baseUrl`; the design's absolute-style values break `tsc`).
6. **Lint stays red (pre-existing debt, not introduced).** `npm run lint` reports 83 errors both with the pre-S1.7 config and the new one on the identical tree (verified by running the baseline config against the moved tree — same count). All are `no-explicit-any` + react-hooks rules in **unchanged moved code**. Fixing them would violate S1.4's zero-content-change mandate; deferred as tracked debt (suggested slice 5 follow-up or dedicated `chore(web)` clean-up PR).

## Test commands run (all green)

- `npm test` → **7 files, 128 tests pass** (6 core + 1 web via workspace aggregation) — identical count to baseline
- `npm run build` → `✓ built`; bundle hashes **identical to baseline** (`index-CDAUf74u.css`, `index-B0NlKSON.js`, `2,853.38 kB`) → web deployable output byte-for-byte unchanged (A-5)
- `npx tsc -b` (root solution) → clean
- `node scripts/fetch-cards.ts` → executes under Node 26 (network run, restored)
- Coach server smoke: `COACH_PORT=9123 node scripts/coach-server.ts` + curl `/health`, POST `/analyze`, GET `/result/:id` → correct responses
- `npm install` → clean, reproducible from regenerated `package-lock.json`

## Workload / PR boundary

- **PR 1 = Slice 1** (S1.1–S1.7), 4 commits, ~4,400 tracked lines touched; rename-dominant (13 core + ~20 web files moved at 93–100% rename detection) + generated `package-lock.json`. `size:exception` approved per Review Workload Forecast (PR 1 row: "overflow → size:exception (rename-aware review)").
- Branch: `chore/expo-core-restructure` off `5b96807`. After this PR: S2.1+ (storage adapter + async hydration) is the next slice; **nothing in slice 2+ was touched**.

## Remaining tasks (slice 2+, out of scope for PR 1 — exact unchecked lines)

- `- [ ] S2.1` … `- [ ] S2.13` (storage contract, hydration, store factory, web async bootstrap)
- `- [ ] S3.1` … `- [ ] S3.4` (mobile shell)
- `- [ ] S4.1` … `- [ ] S4.5` (screens)
- `- [ ] S5.1` … `- [ ] S5.3` (verification sweep)
- Parent-owned lifecycle gates (review, workload guard, sdd-verify, sdd-archive) remain `- [ ]` — parent-owned rows preserved byte-for-byte.

## Risks / residual

- Lint red at baseline (83 pre-existing violations) — tracked debt, not a PR-1 regression (R-low).
- `pokemonTcgApi` localStorage stubs still in core until S2.9 (design-sanctioned for slice 1); SC7/B-3 static scan is a slice-2 gate, not claimed here.
- API regeneration of `cards.generated.ts` network-dependent (502s observed during slice); committed file untouched.

---

# Apply Progress — `expo-mobile-app` (PR 2 / Slice 2: S2.1–S2.11)

> **Phase:** sdd-apply · **Change:** expo-mobile-app · **Store:** openspec (file-based)
> **Delivery:** stacked-to-main; PR 2 = Slice 2 (S2.1–S2.11) per the delegated run scope; branch `chore/expo-storage-hydration` off `7ffce7b` (PR 1 head)
> **Mode:** strict TDD active (`npm test`, vitest) — Slice 2 is a **behavior change**; every core behavior landed RED→GREEN (evidence table below).
> **Baseline:** 7ffce7b (Slice 1 head), clean working tree; 7 files / 128 tests green.

## Structured status consumed

Session artifact store = `openspec` (file-based); no `openspec/state.yaml` exists for this change (store is artifact-files only), so status was resolved per the SDD status-contract fallback: `applyState: in-progress → completed for Slice 2`; `dependencies`: none unmet — S2.1→S2.11 implemented in dependency order (S2.10 landed before S2.9's web callers; S2.7/S2.8 landed test-first per strict TDD); `blockedReasons`: none; `actionContext`: no workspace-planning mode, no `allowedEditRoots` restriction, edits confined to repo root. Skill resolution: `paths-injected` (work-unit-commits, chained-pr, branch-pr SKILL.md paths read before implementation).

## Completed tasks (checkbox updates in `tasks.md` — all verified `- [x]`)

| Task | Persisted checkbox | Red→Green evidence |
|------|--------------------|--------------------|
| S2.1 RED storage conformance + key contract tests | `- [x]` (commit 1245f45) | RED: suite fails `Cannot find module './types'` → GREEN: 11/11 in `storage/types.test.ts` (S2.2) |
| S2.2 GREEN `StorageAdapter` + `STORAGE_KEYS` + in-memory impl | `- [x]` (commit e03e9ff) | 11 storage tests green |
| S2.3 RED migration tests | `- [x]` (commit 7187df7) | RED: `Cannot find module './hydrate'` → GREEN: 6/6 `migrate.test.ts` (S2.4) |
| S2.4 GREEN async `migrateData(adapter, dataVersion?)` | `- [x]` (commit 1dad5c9) | 6 migration tests green |
| S2.5 RED hydration-order/legacy/scenario tests | `- [x]` (commit 5fed9cb) | RED: 11 failed (`hydrate`/`createInitialGameState` missing) → GREEN 11/11 (S2.6) |
| S2.6 GREEN `hydrate()` + `parseAutoSave`/`parseDecks`/`parseScenarios` | `- [x]` (commit 0f98e3d) | 28/28 (hydrate + migrate + storage) |
| S2.7 REFACTOR `createGameStore(adapter)` factory in core | `- [x]` (commit 30b6703) | RED suite (S2.8, commit 91efaa1) failed on missing `./gameStore` → GREEN: 38/38 `gameStore.test.ts` |
| S2.8 REFACTOR store suite → in-memory adapter + `await hydrate()` | `- [x]` (commits 91efaa1 RED, 30b6703 GREEN) | all 37 original assertions preserved + new C-5/R6 persistence cases |
| S2.9 RED→GREEN TCG API adapter injection (core + web callers) | `- [x]` (commits dbf789b RED, fbacd44 GREEN) | RED: 24 failed (12 API + 12 decks.async) → GREEN: 37/37 incl. 5 new cache-contract tests |
| S2.10 GREEN web `localStorage` adapter + conformance test | `- [x]` (commit 41b1add) | RED: 7 failed `window is not defined` → GREEN: 7/7 `apps/web/src/lib/storage.test.ts` |
| S2.11 REFACTOR web async bootstrap switchover | `- [x]` (commit 43b5853) | regression: 11 files / 173 tests green; `tsc -b` clean; web build green |

## TDD Cycle Evidence (strict TDD — RED → GREEN → REFACTOR)

| Cycle | RED (failing) | GREEN (passing) | Refactor |
|-------|---------------|-----------------|----------|
| Storage contract | `storage/types.test.ts` — module missing | 11 passed | none (new file) |
| Migration | `store/migrate.test.ts` — module missing | 6 passed | none (new file) |
| Hydration + parsers | `store/hydrate.test.ts` — 11 failed | 11 passed (28 with migrate+storage) | test interaction fix: read-back cases seed current `DATA_VERSION` (see Deviations) |
| Store factory | `store/gameStore.test.ts` (adapted, moved to core) — suite could not load `./gameStore` | 38 passed | `createGameStore(adapter)` factory; async manual actions; `resetGame` reads hydrated decks via `getHydratedDecks` |
| API adapter injection | `pokemonTcgApi.test.ts` + `decks.async.test.ts` — 24 failed | 37 passed | cache fns async over adapter; `adapter` as first param of `fetchCard`/`fetchDeckCards`/`fetchCardFromTcgdex`/`parseDeckListWithApi`; web callers pass `webStorage` |
| Web adapter | `apps/web/src/lib/storage.test.ts` — 7 failed (`window is not defined`) | 7 passed | adapter reads `window.localStorage` (browser-correct); test stubs `window` |
| Web switchover | regression-only (no new behavior) | 11 files / 173 tests | main.tsx skeleton gate + `hydrate`; `apps/web/src/store/` deleted; singleton `lib/gameStore.ts` |

## Files changed (12 work-unit commits, by commit)

1. `1245f45 test(core): add RED storage contract conformance and key inventory tests` — `packages/core/src/storage/types.test.ts` (new)
2. `e03e9ff feat(core): add async StorageAdapter contract with in-memory implementation` — `packages/core/src/storage/types.ts` (new; `StorageAdapter`, frozen `STORAGE_KEYS` 7 keys, `createInMemoryStorage(seed?)` + `dump()`)
3. `7187df7 test(core): add RED data-version migration tests` — `packages/core/src/store/migrate.test.ts` (new)
4. `1dad5c9 feat(core): add async idempotent migrateData over the storage adapter` — `packages/core/src/store/hydrate.ts` (new, `DATA_VERSION='2'` + `migrateData`)
5. `5fed9cb test(core): add RED hydration order, legacy tolerance and scenario read-back tests` — `packages/core/src/store/hydrate.test.ts` (new)
6. `0f98e3d feat(core): add explicit async hydrate with legacy-tolerant parsers` — `hydrate.ts` + `hydrate.test.ts` (order, autosave/decks/scenarios seeding, malformed/legacy tolerance, idempotency, R6, R5 read-back)
7. `91efaa1 test(core): adapt store suite to in-memory adapter and hydrate (RED)` — `gameStore.test.ts` moved `apps/web/src/store/` → `packages/core/src/store/` (+ new C-5/R6 cases)
8. `30b6703 refactor(core): promote gameStore to createGameStore factory with async adapter persistence` — `packages/core/src/store/gameStore.ts` (new; `createGameStore(adapter)`, `GameStore`/`GameStoreApi` exported, `hasActiveGame`; web copy kept unchanged)
9. `41b1add feat(web): add localStorage adapter conforming to the core storage contract` — `apps/web/src/lib/storage.ts` + `storage.test.ts` (new)
10. `dbf789b test(core): inject adapter into API service tests with cache contract cases (RED)` — `pokemonTcgApi.test.ts` (adapted to in-memory adapter; new cache round-trip/expiry/persistence tests), `decks.async.test.ts` (adapter arg)
11. `fbacd44 feat(core): adapter-inject TCG API cache and fetch entrypoints with web callers` — `pokemonTcgApi.ts` (async `getCache`/`setCache`/`getTcgdexCache`/`setTcgdexCache` over `STORAGE_KEYS`; `adapter` first param on `fetchCard`/`fetchDeckCards`/`fetchCardFromTcgdex`), `decks.ts` (`parseDeckListWithApi(adapter, text, onProgress?)`), `apps/web/src/components/BattleField.tsx` (passes `webStorage`)
12. `43b5853 refactor(web): async bootstrap with core store factory and hydration gate` — `packages/core/src/index.ts` (barrel per design §4.4), `apps/web/src/main.tsx` (skeleton → `hydrate` → render; data-version block removed; HMR/beforeunload kept), `apps/web/src/App.tsx` + `components/{BattleField,ScenarioEditor,ExportPanel}.tsx` (imports → core/lib), `apps/web/src/lib/gameStore.ts` (new singleton), `apps/web/src/store/gameStore.ts` (deleted — B-2 no duplicate), `apps/web/src/index.css` (skeleton styles)

## Test commands run (all green at HEAD)

- `npm test` — **11 files, 173 tests pass** (baseline was 7 files / 128): core storage(11) + migrate(6) + hydrate(11) + gameStore(38) + pokemonTcgApi(25, incl. 5 cache-contract) + decks.async(12) + web storage(7) + moved pure suites unchanged
- `npx tsc -b` (root solution, both workspaces) — clean
- `npm run build` (web) — `✓ built`; bundle changed as expected (behavior change: async hydration) → `index-BRTt3H1-.js` / `index-ZIy-rXDp.css`
- Static scans (slice-2 gate SC7 / B-3): `grep localStorage|AsyncStorage packages/core/src` → only comments, **zero storage access in core**; `grep window.|document.|react-dom|react-markdown|remark-gfm packages/core/src` → **zero matches**

## Deviation log (from design.md / tasks.md)

1. **Test-first order swapped for S2.7/S2.8** — the adapted `gameStore.test.ts` (S2.8) landed as the RED before the factory (S2.7) to satisfy strict TDD; tasks.md lists S2.7 first but its own tag says "red→green via adapted suite (next task)". Final state identical.
2. **`hydrate()` typed against a structural `HydrationStore`** (design §4.2 sketched `GameStoreApi = UseBoundStore<StoreApi<GameStore>>`): avoids a circular `hydrate.ts ↔ gameStore.ts` module dependency. The zustand bound store satisfies the structural type at every call site (`main.tsx`, tests). Public behavior identical.
3. **`apps/web/src/lib/gameStore.ts` singleton added** — S2.11's deletion of `apps/web/src/store/` forces one home for the shared hydrated instance consumed by `App`/components; the task Files list named only main.tsx/App/store-del/barrel. It contains zero store logic (B-2 holds: no duplicate, only the instance binding).
4. **Full design §4.4 barrel built at S2.11** — web switchover needs root exports (`createGameStore`/`hydrate`/`hasActiveGame`); the barrel is a single coherent artifact, so it shipped complete (types, storage, store, stateExporter, stateImporter, promptGenerator; `pokemonTcgApi`/`decks` intentionally NOT at root — R7 `CardData` collision). S2.13's remaining scope = final static-scan/check only.
5. **Read-back tests seed the current `DATA_VERSION`** (hydrate.test.ts ×3, gameStore.test.ts ×1) — discovered that `migrateData` wipes `pokemon-custom-decks`/`pokemon-scenarios` on version mismatch (exact legacy web v2 behavior), so those tests exercise a settled (migrated) device; the wipe itself is covered by `migrate.test.ts`. Web parity preserved (A-5).
6. **Cache tests seed the real legacy cache key format** — cache keys keep setCode as typed (`dreepy_TWM_128`, not lowercased); production key computation untouched (zero-change, G-1), tests match reality.
7. **`loadCustomDecks` now normalizes malformed data to `[]`** via `parseDecks` (legacy no-op'd on garbage) — same behavior for valid/absent data; stricter for corrupt data (documented, harmless).
8. **Core tsconfig keeps `lib: ["ES2023","DOM"]`** (extends slice-1 deviation #4): post-S2.9 the API service still type-checks `fetch`/`Response`/`AbortSignal` (network APIs in DOM lib). `types: []` unchanged; no `window`/`document` identifiers in core.
9. **S2.12/S2.13 deferred (out of delegated scope)** — this run implements S2.1–S2.11 only. `ExportPanel` coach-session still reads `localStorage` directly (web-side, S2.12 task) and the S2.13 boundary-scan/barrel-finalization remains unchecked; SC7 full-key sweep for the coach key is a follow-up.

## Remaining tasks (slices 2 tail + 3+, out of scope for PR 2 — exact unchecked lines)

- `- [ ] S2.12` — REFACTOR: ExportPanel coach session through the web adapter (7th key)
- `- [ ] S2.13` — GREEN: core barrel + DOM-free boundary scan (barrel content already shipped at S2.11; scan re-verification remains)
- `- [ ] S3.1` … `- [ ] S3.4` (mobile shell)
- `- [ ] S4.1` … `- [ ] S4.5` (screens)
- `- [ ] S5.1` … `- [ ] S5.3` (verification sweep)
- Parent-owned lifecycle gates (bounded review, workload guard, sdd-verify, sdd-archive) remain `- [ ]` — preserved byte-for-byte.

## Workload / PR boundary

- **PR 2 = Slice 2 (S2.1–S2.11)**, 12 commits; branch `chore/expo-storage-hydration` from `7ffce7b`. Diff stats vs base at head: see `git diff 7ffce7b --stat` (moved/adapted suites count large; no generated files — `package-lock.json` untouched).
- The SDD forecast split Slice 2 into sub-PRs (2a–2e, est. ~1,400 lines); the orchestrator delegated Slice 2 as ONE PR (S2.1–S2.11) and instructed "size:exception only if the diff includes generated files, otherwise note within budget". **Honest assessment:** the diff crosses the 400-line review guideline (slice is behavior-dominant with moved suites), there are NO generated files, so no `size:exception` is claimed — the PR body states the actual diff stats and the forecast's sub-PR plan for reviewer navigation instead of asserting "within budget".
- After this PR: S2.12/S2.13 then Slice 3 (mobile shell) is the next slice; nothing in slice 3+ was touched.

## Risks / residual

- PR 2 diff is over the 400-line guideline by design (delegated scope = slice 2 whole); sub-PR 2a–2e boundaries documented in the PR body for reviewer navigation (R-low, process risk only).
- `loadCustomDecks`/scenario read-back behaviors are new core semantics validated by the adapted suites; web runtime smoke (reload-restore, scenario survival) is manual — recommended for `sdd-verify`/S5.1.
- StrictMode double-mount hydrates twice in dev (idempotent by design, tested D-2); first paint shows the skeleton until hydration resolves.
- Lint baseline debt (83 pre-existing errors) unchanged (tracked in slice 1; not introduced).

---

# Apply Progress — `expo-mobile-app` (PR 3 / Slice 3: S3.1–S3.4)
> **Phase:** sdd-apply · **Change:** expo-mobile-app · **Store:** openspec (file-based)
> **Delivery:** stacked-to-main; PR 3 = Slice 3 (mobile shell, additive; web untouched); branch `chore/expo-mobile-shell` off `d34970a` (PR 2 head / `chore/expo-storage-hydration`)
> **Mode:** strict TDD active (`npm test`, vitest) — S3.4 is RED→GREEN (mobile adapters + clipboard wrapper); S3.1–S3.3 are scaffold/bundle-evidence tasks (TDD n/a) per tasks.md.
> **Baseline:** d34970a, clean tree; 11 files / 173 tests green. **NOTE:** no iOS Simulator devices available in this environment (Xcode 26.6 present, zero runtimes) — S3.1–S3.3 gates are evidenced with Metro export bundles + sourcemap graph checks instead, and simulator-only claims are explicitly NOT made.

## Structured status consumed

Session artifact store = `openspec` (file-based); no `openspec/state.yaml` exists (store is artifact-files only) → status resolved per the SDD status-contract fallback: `applyState: in-progress → completed for Slice 3`; `dependencies`: none unmet (S3.1 → S3.2 → S3.3/S3.4 chain; S3.4 RED landed before the GREEN impl per strict TDD, see Ordering note); `blockedReasons`: none; `actionContext`: no workspace-planning mode, no `allowedEditRoots` restriction, edits confined to repo root. Skill resolution: `paths-injected` (work-unit-commits, chained-pr, branch-pr SKILL.md paths read before implementation).

## Completed tasks (checkbox updates in `tasks.md` — all verified `- [x]`)

| Task | Persisted checkbox | Evidence |
|------|--------------------|----------|
| S3.1 Expo scaffold in `apps/mobile` + root `build:mobile` | `- [x]` (commit 0734466) | `npx create-expo-app@latest` (SDK 57 default template, expo-router) → renamed `@pokemon-simulator/mobile`, added `export` script; root `npm install` registered the workspace; proof: `npm run export -w @pokemon-simulator/mobile` bundles the template app (1520 modules, iOS Hermes `.hbc`) |
| S3.2 Metro monorepo resolution (R3) | `- [x]` (commit 78bfbec) | `apps/mobile/metro.config.js` (watchFolders=workspaceRoot; nodeModulesPaths=[app,root]); smoke import `STORAGE_KEYS` from `@pokemon-simulator/core` in `_layout.tsx`; proof: `expo export --dump-sourcemap` → sourcemap lists `packages/core/src/{index, storage/types, store/gameStore, store/hydrate, services/*}.ts` → core SOURCE resolves+transpiles through Metro |
| S3.3 Hydration-gate shell (D-1/D-2/D-3) | `- [x]` (commit 3c87f21) | `_layout.tsx` skeleton→Tabs gate, `StorageProvider` (module-scope store + shared hydration promise — no double-init), `useStorage.ts`; four tabs (Tablero default, Biblioteca, Exportar, Escenarios); proof: `expo export` bundles all 4 routes + `storage-provider` + `useStorage` + core hydrate graph (1147 modules); D-3 grep: only mention of "coach" is a comment; simulator boot NOT verified (no simulator) |
| S3.4 RED→GREEN mobile adapters + clipboard + tests | `- [x]` (commits 6fc0f5f RED, 5a6d584 GREEN) | RED: both suites fail `Cannot find module './storage'` / `'./clipboard'`; GREEN: `lib/storage.ts` (`mobileStorage` over AsyncStorage, C-2) + `lib/clipboard.ts` (`copyText`/`shareText`, F-1/D-4); `npm test` 13 files / 182 tests green (9 new mobile) |

## TDD Cycle Evidence (strict TDD — RED → GREEN for S3.4)

| Cycle | RED (failing) | GREEN (passing) | Refactor |
|-------|---------------|-----------------|----------|
| AsyncStorage adapter | `src/lib/storage.test.ts` — failed suite, `Cannot find module './storage'` | 7 passed (conformance vs core contract C-2/H-1/H-3: missing-key null, round-trip, overwrite, remove, idempotent remove, STORAGE_KEYS routing, named helpers) | none (new file) |
| Clipboard wrapper | `src/lib/clipboard.test.ts` — failed suite, `Cannot find module './clipboard'` | 2 passed (`copyText` → expo-clipboard `setStringAsync`; `shareText` → expo-file-system temp `pokemon-export-*.md` in cache + expo-sharing `shareAsync(uri, {mimeType: 'text/markdown'})`) | none (new file) |

## Files changed (6 work-unit commits on `chore/expo-mobile-shell`)

1. `0734466 chore(mobile): scaffold Expo SDK 57 app in the npm workspace` — `apps/mobile/**` (create-expo-app SDK 57 default template + `.gitignore`/`app.json`/`tsconfig.json`/`assets`/`scripts/reset-project.js`; template AI-meta noise `.claude/`, `AGENTS.md`, `CLAUDE.md` deleted), `package.json` (root `build:mobile`), `package-lock.json` (mobile workspace deps)
2. `78bfbec feat(mobile): configure Metro for the npm-workspaces monorepo` — `apps/mobile/metro.config.js` (new, design §2b adapted to SDK 57/Metro 0.84), `src/app/_layout.tsx` (core-import smoke probe `STORAGE_KEYS`)
3. `6fc0f5f test(mobile): add RED AsyncStorage adapter and clipboard wrapper tests` — `src/lib/storage.test.ts`, `src/lib/clipboard.test.ts`, `apps/mobile/vitest.config.ts`, `vitest.workspace.ts` (+`apps/mobile`), `package.json`/`package-lock.json` (expo-clipboard/expo-sharing/expo-file-system/async-storage deps)
4. `5a6d584 feat(mobile): add AsyncStorage adapter and clipboard/share bridge` — `src/lib/storage.ts`, `src/lib/clipboard.ts` (design §4.5)
5. `3c87f21 feat(mobile): add hydration-gate shell with four expo-router tabs` — `src/app/_layout.tsx` (gate + `<Tabs>`), `src/app/{index,decks,export,scenarios}.tsx` stubs, `src/components/storage-provider.tsx`, `src/hooks/useStorage.ts`, `src/global.d.ts`, `apps/mobile/tsconfig.json` (extends root base + `@/*`/core paths), root `tsconfig.json` (+`apps/mobile` reference), deleted template demo surface (`explore.tsx`, `app-tabs.{tsx,web.tsx}`, `animated-icon.web.tsx`+module.css), template strict fixes (`type`-only imports in external-link/collapsible/themed-text/themed-view)

## Test commands run (all green at HEAD)

- `npm test` → **13 files, 182 tests pass** (baseline 11/173; +9 mobile: 7 adapter conformance + 2 clipboard)
- `npx tsc -b` → clean across **three** workspaces (core + web + mobile now in the root solution)
- `npm run build` (web) → `✓ built`; hashes **byte-identical to slice 2** (`index-ZIy-rXDp.css`, `index-BRTt3H1-.js`) — web untouched (A-5)
- `npm run export -w @pokemon-simulator/mobile` → iOS Hermes bundle `_expo/static/js/ios/entry-0df8b9f2….hbc` (3.7MB, 1147 modules) containing the shell + core graph
- Metro sourcemap files list `apps/mobile/src/{app/*, components/storage-provider, hooks/useStorage, lib/storage}` and `packages/core/src/{index,storage/types,store/gameStore,store/hydrate,services/*}`
- `npx tsc --noEmit -p apps/mobile/tsconfig.json` → clean standalone (mobile typechecks under the shared strict root base)

## Deviation log (from design.md / tasks.md — all deliberate, none silent)

1. **Expo SDK 57 scaffold, not SDK 53** — `create-expo-app@latest` installs the SDK 57 default template (latest stable; proposal says `latest stable`). Consequences: template uses `src/` layout (routes under `src/app/`), no `babel.config.js` needed (babel-preset-expo default), no `metro.config.js` shipped in template (created in S3.2), and `Tabs` must be wired in the root `_layout` (classic `Stack` navigator no longer exported by expo-router 57 — the template itself uses native tabs + flat routes). Design §2c's `app/_layout.tsx` = gate + `<Tabs>` + flat `src/app/{index,decks,export,scenarios}.tsx` is what shipped (design tree comment), instead of a `(tabs)/` group dir.
2. **Metro flags from design §2b obsolete in Metro 0.84** — `unstable_enablePackageExports` defaults to `true` (metro-config defaults verified) and `unstable_enableSymlinks` was removed (symlinks always on for monorepos). `metro.config.js` ships the design's `watchFolders = [workspaceRoot]` + `nodeModulesPaths = [app node_modules, root node_modules]` (ORDER FLIPPED vs design's [root, app]: root-first would shadow the app-nested react@19.2.3 with the hoisted root 19.2.4, breaking RN 0.86's exact pin; Expo's own `getModulesPaths()` also uses app-first). Design's fallback (babel-plugin-module-resolver) was NOT needed — package-exports resolution works.
3. **S3.3/S3.4 commit order swapped** — the hydration gate needs `mobileStorage`, and strict TDD requires the adapter tests RED before the impl: commits land RED tests → GREEN lib → shell (same swap slice 2 used for S2.7/S2.8). Final state identical to the tasks.md dependency order.
4. **`apps/mobile/vitest.config.ts` include is `src/lib/**/*.test.ts`** (design said `lib/**` for the SDK 53 app-root `lib/` dir); SDK 57 template puts app code under `src/`.
5. **Mobile tsconfig extends root `tsconfig.base.json` with Expo options inlined** (`allowJs`, `resolveJsonModule`, `lib` +DOM/ESNext, `module: preserve`, `customConditions: ['react-native']`), because TS supports one `extends`; A-3 satisfied — mobile inherits `strict`/`verbatimModuleSyntax`/`noUnusedLocals`/`noUnusedParameters`. Four template files got `type`-only import fixes to pass `verbatimModuleSyntax`. `apps/mobile` joined the root `tsc -b` solution (A-1/A-3).
6. **`export` script scoped to `--platform ios`** — the template's all-platform export fails on the WEB static render only (`@expo/router-server` at root node_modules cannot resolve `@expo/metro-runtime`, which npm nested under `apps/mobile/node_modules` because of the react 19.2.3-vs-19.2.4 hoisting conflict). Native (this PR's target) bundles fine; expo web is not a requirement. Documented, not fixed silently; a future slice may add the dep to unblock web export.
7. **`src/global.d.ts` ambient CSS-module declarations** — replaces the gitignored, `expo-start`-generated `expo-env.d.ts` for deterministic standalone `tsc -p apps/mobile` (template `theme.ts` imports `@/global.css`).
8. **Template demo cleanup within scaffold scope** — deleted `explore.tsx` + `app-tabs.{tsx,web.tsx}` (route wiring replaced by the four-tab gate) and `animated-icon.web.tsx`+`animated-icon.module.css` (unused web demo variant that blocked strict CSS-module typing). Remaining themed components stay (generated; usable by slice 4).

## Remaining tasks (slice 2 tail + 4+, out of scope for PR 3 — exact unchecked lines)

- `- [ ] S2.12` — REFACTOR: ExportPanel coach session through the web adapter (7th key)
- `- [ ] S2.13` — GREEN: core barrel + DOM-free boundary scan (barrel content already shipped at S2.11; scan re-verification remains)
- `- [ ] S4.1` … `- [ ] S4.5` (screens)
- `- [ ] S5.1` … `- [ ] S5.3` (verification sweep)
- Parent-owned lifecycle gates (bounded review, workload guard, sdd-verify, sdd-archive) remain `- [ ]` — preserved byte-for-byte.

## Workload / PR boundary

- **PR 3 = Slice 3 (S3.1–S3.4)**, 6 commits + docs commit; branch `chore/expo-mobile-shell` from `d34970a`. Hand-written lines ≈ 700 (shell + libs + tests + configs); generated scaffold + lockfile dominate the diff. The forecast listed Slice 3 as `3a scaffold+metro (generated → size:exception)` + `3b shell ~250 OK` + `3c adapters ~180 OK`; the delegated run delivered all three as one PR (same pattern as PR 2). No gameplay screens (slice 4) were touched; web sources untouched.
- After this PR: S2.12/S2.13 (slice 2 tail), then Slice 4 (screens) is the next slice; nothing in slice 4+ was touched.

## Risks / residual

- **Simulator verification NOT performed** (no iOS runtime installed): D-1/D-2/E-* runtime acceptance needs `sdd-verify` on a real simulator/emulator (S5.2). Bundle-level evidence is recorded above; the shell boot and four tabs may still surface runtime-only issues (e.g. Tabs re-render on theme change) that only a device run can catch.
- AsyncStorage native module, expo-clipboard/sharing/file-system native modules are SDK-57-standard but their device behavior is unverified in this environment.
- The template's nested `node_modules` (react 19.2.3 etc.) is an npm hoisting artifact; `package-lock.json` records it. Web export of the mobile app remains broken (deviation 6) — out of scope, tracked.
- Root `package-lock.json` changed (+~527 packages) as expected for the new workspace (single-lockfile contract A-2).
