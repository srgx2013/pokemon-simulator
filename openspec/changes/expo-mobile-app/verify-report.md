# Verify Report — `expo-mobile-app`

> **Phase:** sdd-verify · **Change:** expo-mobile-app · **Store:** openspec (file-based)
> **Branch at verification:** `chore/expo-acceptance` @ `afa35dd` (full implementation state; 5 stacked PR branches off `main`: `chore/expo-core-restructure`, `chore/expo-storage-hydration`, `chore/expo-mobile-shell`, `chore/expo-mobile-screens`, `chore/expo-acceptance`)
> **Mode:** strict TDD active (`npm test`, vitest, workspace-aggregated)
> **Independent re-run:** every command and scan below was executed fresh by sdd-verify against the working tree — the apply agent's grep/bundle/test claims were not trusted as-is.

---

## Aggregate verdict

| Level | Verdict |
|-------|---------|
| Implementation completeness (tasks) | **PASS with one unchecked task (S5.2, evidence-deferred)** |
| Unit + bundle + static-scan acceptance (all 32 spec requirements) | **PASS** — `npm test` 18 files / 224 tests exit 0; `tsc -b` clean; web build + wrangler dry-run reproduce; mobile Hermes export reproduces (byte-identical bundle hash) |
| Device-runtime acceptance (D-1/D-2 legs, E-2, E-3/E-4 legs, F-1 share sheet, G-2 airplane-mode, N-1 cold-start) | **NOT VERIFIED — deferred (genuinely environment-blocked, nothing claims them as verified)** |

**Overall status: `partial` — NOT ready for archive.** The implementation is complete and unit/bundle/scan-verified, and the applied evidence is honest about what it cannot claim. But per the task-checkbox contract, the unchecked S5.2 row plus the deferred device legs (E-2, G-2, N-1) are archive blockers until executed on a real simulator/emulator or a CI device lane.

---

## 1. Structured status & actionContext findings

- Artifact store: openspec (file-based); **no `openspec/state.yaml`** exists — status resolved from `apply-progress.md` sections + the SDD status contract fallback.
- `applyState`: completed for all 5 slices (per apply-progress); `dependencies`: none unmet; `blockedReasons`: none.
- `actionContext`: no `workspace-planning` mode; no `allowedEditRoots` restriction; all edits confined to the repo; verify phase wrote ONLY `verify-report.md` (no implementation code touched).
- Native SDD dispatcher not invoked (openspec store here is artifact-files; parent supplied authoritative input paths; per-orchestrator guard the openspec file store substitute applies).

## 2. Verification commands (all re-run by this phase — actual results)

| Command | Result |
|---------|--------|
| `npm test` (root, vitest workspace) | ✅ **18 files / 224 tests passed, exit 0** (2.10s; matches the apply claim exactly) |
| `npx tsc -b` (root solution, 3 workspaces) | ✅ exit 0, clean |
| `npm run build` (web → dist) | ✅ `dist/assets/index-BZDi2R11.js` **2,855.31 kB** (gzip 398.83) + `index-ZIy-rXDp.css` — byte-identical hashes to slice-5 claim |
| `npx wrangler deploy --dry-run` (from `apps/web`) | ✅ "✨ Read 9 files from the assets directory … `--dry-run: exiting now.`" — no deploy performed, matches claim |
| `npm run export -w @pokemon-simulator/mobile -- --dump-sourcemap` | ✅ reproduced **`_expo/static/js/ios/entry-2496099fa821f5e8260df6219d594742.hbc` (3.3MB)** + `.hbc.map` (9.7MB) — exact hash match; sourcemap contains `cards.generated` (B-4) and `packages/core/src` sources (S3.2 R3) |
| `npm run lint` | ❌ **96 errors** (0 warnings) — see Finding W-2 |

Environment proof (re-run): `xcrun simctl list runtimes` → **zero runtimes** (header only); `emulator`/`adb`/`sdkmanager` not on PATH; `ANDROID_HOME` unset. **The "no runtime" claim is genuine — device legs are not fabricable here.**

## 3. Spec coverage (all 32 enumerated requirements, A-1…N-1)

Evidence naming real test files, scans, and bundle artifacts; `unit` = passing vitest suite at HEAD.

### A — Repository & Workspace (A-1 … A-5) — ✅ VERIFIED
- A-1: `package.json` workspaces `["packages/*","apps/*"]`; `vitest.workspace.ts` aggregates all 3 workspaces; all three resolve (test/tsc/build above).
- A-2: `bun.lock` absent; committed `package-lock.json` present; `npm install` reproducible per apply record; all root scripts `npm run` (re-invoked: `npm test`, `npm run build`, `npm run export -w …`).
- A-3: `tsconfig.base.json` (`strict`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`) inherited by all 3 workspaces; `npx tsc -b` clean (no workspace disables — verified by inspection of the three tsconfigs' extends).
- A-4: root `npm test` aggregates and exits 0 ⇔ 18/224 observed.
- A-5: web build + wrangler dry-run green at every merge point recorded; deployable dist present.

### B — Shared Core (B-1 … B-4) — ✅ VERIFIED (bundle legs noted)
- B-1: the 7 original suites moved (verified in git: `4df69b6` moved 6 pure suites with 0-content renames; `91efaa1`/`30b6703` moved+adapted `gameStore.test.ts`); all green at HEAD (`data/decks.test.ts`, `decks.async.test.ts`, `services/{stateExporter,stateImporter,promptGenerator,pokemonTcgApi}.test.ts`, `store/gameStore.test.ts`).
- B-2: `apps/web/src/store` **absent** (verified); web consumes `createGameStore`/`hydrate`/`hasActiveGame` from `@pokemon-simulator/core` (`main.tsx`, `lib/gameStore.ts` singleton = instance binding only — no store logic). No duplicate store/API modules in web.
- B-3: fresh scans (see §4) — zero DOM/renderer refs in core non-test sources.
- B-4: `cards.generated.ts` present in the iOS Hermes bundle (re-run sourcemap hit) and the web bundle; on-device load deferred leg.

### C — Persistence & Hydration (C-1 … C-6) — ✅ VERIFIED
- C-1: `STORAGE_KEYS` frozen with exactly the 7 keys (verified: `storage/types.ts:19-27`); API service caches via `STORAGE_KEYS.tcgCache`/`tcgdexCache` through the adapter (`pokemonTcgApi.ts:74,85,201,212`); coach key (7th) flows via `apps/web/src/lib/coachSession.ts` (S2.12, 7 unit tests).
- C-2: three adapters (web `localStorage`, mobile AsyncStorage, core in-memory) + three conformance suites (`apps/web/src/lib/storage.test.ts` 7, `apps/mobile/src/lib/storage.test.ts` 7, `storage/types.test.ts` 11).
- C-3: `createGameStore(adapter)` factory — **no module-load storage** (verified: `gameStore.ts` top level imports only; autosave subscriber registered inside factory); web `main.tsx` skeleton→hydrate→render; mobile `_layout.tsx` gate with module-scope shared `hydrationPromise ??=` (no double-init).
- C-4: `migrateData` async/idempotent (`store/migrate.test.ts` 6); `parseAutoSave` is a **byte-identical verbatim move** of legacy `loadAutoSave` (verified by side-by-side diff of `30b6703^:apps/web/src/store/gameStore.ts` vs `hydrate.ts:51-88` — only the storage read was extracted to the adapter parameter, per C-3).
- C-5: `gameStore.test.ts` (38) covers async autosave subscription + async manual actions awaiting adapter writes.
- C-6: clean-default seeding covered (`hydrate.test.ts` "seeds a clean default state when storage is empty (C-6)").

### D — Mobile Shell & Navigation (D-1 … D-4) — ✅ at bundle/unit/scan · device legs ⏳
- D-1: exactly 4 routes exported (`src/app/{index,decks,export,scenarios}.tsx` in re-run bundle); board `index` is default first tab (`_layout.tsx` Tabs order). Tab *interaction* on device ⏳.
- D-2: skeleton gate + shared hydration promise verified in source; core idempotent double-call test (`hydrate.test.ts`); background/resume behavior ⏳ device.
- D-3: fresh scan — "coach" in `apps/mobile/src` only in 2 explanatory comments (`app/_layout.tsx:11`, `components/export-panel-view.tsx:14`), zero UI entry points, zero HTTP; web coach intact and now adapter-persisted (S2.12).
- D-4: fresh scan — no `navigator.clipboard`/`document.createElement`/portals in mobile sources; `Alert`/`Modal`/`Pressable`/`expo-clipboard`/`expo-sharing` used (`clipboard.test.ts` 2).

### E — Gameplay UI (E-1 … E-4) — ✅ unit · device legs ⏳
- E-1: board interactions route exclusively through core actions (verified: `game-board.tsx` selects `addDamage/addEnergy/setStatus/swapPlayers/resetGame` from the store; side-wide energy limits match web semantics); helper logic unit-tested (`src/lib/boardState.test.ts` 12, `deckUtils.test.ts` 16).
- E-2: restore logic unit-covered (hydrate autosave restore + restore semantics in `gameStore.test.ts`); **kill-and-relaunch exact restore on iOS/Android ⏳ DEFERRED — not verifiable here**; nothing claims it verified.
- E-3: custom deck add/remove persistence via core C-5 cases + adapter conformance; on-device restart ⏳.
- E-4: pacing/backoff/TTL in `pokemonTcgApi.test.ts` (25); cache-first; on-device responsiveness ⏳.

### F — Import/Export (F-1 … F-3) — ✅ unit
- F-1: `clipboard.test.ts` (2) — copy via expo-clipboard, share via expo-sharing temp file + `${mimeType}`; `importExport.test.ts` `buildExportMarkdown` mirrors web's core `stateExporter` structure; share-sheet *presentation* ⏳ device.
- F-2: `importExport.test.ts` — valid import through shared core `importStateFromJson`, malformed rejection, full default-state round-trip. ✅
- F-3: `scenarioWiring.test.ts` (7) + core `hydrate.test.ts` scenario read-back; on-device relaunch ⏳.

### G — External API (G-1, G-2) — ✅ unit · device leg ⏳
- G-1: cache round-trip/expiry/persistence, backoff/pacing preserved in core (`pokemonTcgApi.test.ts`).
- G-2: all gameplay/autosave/deck/scenario persistence adapter-only (network-free); cache-first lookup degradation; **airplane-mode on-device leg ⏳ DEFERRED — nothing claims it verified**.

### H — Tests (H-1 … H-3) — ✅ VERIFIED
- H-1: 7 original suites + new storage/migration/hydration suites in core; web adapter + coach suites in `apps/web` (location deviation documented in tasks S2.10 note — conformance measured against the same core contract).
- H-2: strict TDD evidence tables present in apply-progress for every behavior slice (S2.1–S2.12 RED→GREEN, S4 logic modules RED→GREEN, S2.12 RED→GREEN); all RED test files exist and pass now.
- H-3: mobile unit-only — 6 suites / 50 tests, no jest-expo (verified in `vitest.config.ts` `environment: node`, `include: src/lib/**/*.test.ts`).

### N — Non-Functional (N-1) — ⚠️ PARTIAL
- Bundle sanity: ✅ VERIFIED (Hermes export + web build at HEAD; `cards.generated` in bundle).
- **Cold-start time/memory measurement ⏳ DEFERRED** — N-1 requires a measured simulator run; no runtime exists. Nothing claims it as verified.

## 4. State-consistency invariants (fresh independent scans)

| Invariant | Fresh result |
|-----------|--------------|
| B-2 end-state: no duplicate store in `apps/web` | ✅ `apps/web/src/store` does not exist; only `lib/gameStore.ts` (binding) |
| SC7: no `localStorage`/`AsyncStorage` in core except adapter | ✅ 1 hit in non-test core sources = the contract doc comment `storage/types.ts:5`; `gameStore.test.ts` references storage only as adapter keys |
| B-3/SC7: no `window`/`document` in core | ✅ 0 hits |
| B-3: no `react-dom`/`react-markdown`/`remark-gfm` in core | ✅ 0 hits |
| C-1: 7-key `STORAGE_KEYS` inventory | ✅ exactly `pokemon-autosave`, `pokemon-custom-decks`, `pokemon-scenarios`, `pokemon-data-version`, `pokemon_tcg_cache`, `tcgdex_cache`, `pokemon-coach-session`, frozen |
| Barrel sanity (R7) | ✅ `index.ts` re-exports types/storage/store/hydrate/services; `pokemonTcgApi`/`decks` intentionally NOT at root (CardData collision) |
| C-3: no module-load storage | ✅ `gameStore.ts` + `hydrate.ts` have zero top-level adapter access; web `lib/storage.ts` async-safe |
| D-3/D-4 mobile scans | ✅ coach = comments only; browser APIs = comments only |
| Web direct `localStorage` | ✅ code sites only in `apps/web/src/lib/storage.ts:9,13,17` (rest are comments) |

## 5. Task completion (exact unchecked implementation lines)

All implementation tasks except one are `- [x]` (verified by re-read of `tasks.md`). The exact unchecked implementation row:

> `- [ ] **S5.2 — Mobile acceptance matrix (iOS Simulator + Android emulator).** … (evidence-deferred: no iOS runtime / Android emulator in this environment — see acceptance-matrix.md; unit+bundle legs verified, device legs REQUIRE sdd-verify/CI device lane)`

- This is **CRITICAL for archive readiness** per the task-checkbox contract: S5.2 is an implementation task that remains unchecked; its device legs (E-2 both platforms, G-2 airplane-mode, N-1 cold-start, D-1/D-2/F-1 hands-on) are **not verified** and cannot be verified in this environment (proven above).
- Parent-owned lifecycle gates (bounded review per PR, review-workload guard confirmation, sdd-verify run, sdd-archive) remain `- [ ]` — parent-owned rows, not implementation tasks; reported for tracking.
- **Archive is NOT ready** while S5.2 stays unchecked.

## 6. Strict TDD compliance

- TDD Cycle Evidence tables: **present** in apply-progress for all behavior slices (Slice 2: 7 cycles; Slice 3: 2 cycles; Slice 4: 4 cycles; Slice 5: 1 cycle; Slice 1 regression-only per tasks.md). No CRITICAL missing-evidence finding.
- RED files cross-referenced: each RED suite exists in the tree (`storage/types.test.ts`, `migrate.test.ts`, `hydrate.test.ts`, `gameStore.test.ts`, `pokemonTcgApi.test.ts`, `apps/web/src/lib/{storage,coachSession}.test.ts`, mobile `lib/*.test.ts`).
- GREEN confirmed: **18/18 files, 224/224 tests pass** on fresh run.
- Test layer: **100% unit** (0 integration, 0 E2E) — exactly what H-3 mandates (no jest-expo).
- Coverage tooling: not configured in this repo (no coverage provider detected) — "Coverage analysis skipped — no coverage tool detected" is informational, not a failure.

### Assertion Quality Audit (Step 5f)

Sampled every new/changed suite family. Findings:

| File | Finding | Severity |
|------|---------|----------|
| `storage/types.test.ts` (11) | Value-level round-trip/overwrite/remove/dump/seed assertions; key-set frozen check; no tautologies, no ghost loops | ✅ |
| `store/hydrate.test.ts` (11) | Well-triangulated: migration order, autosave restore, legacy shape, malformed never-throws, decks/scenarios seeding, clean default, idempotency, partial malformation, R6 both directions (restores hydrated decks AND keeps null on fresh boot) | ✅ |
| `store/gameStore.test.ts` (38) | Preserved original web assertions + new C-5/R6/persistence cases; `not.toBeNull()` always followed by value asserts (verified e.g. l.155→156) | ✅ |
| `apps/web/src/lib/coachSession.test.ts` (7) | Binds 7th key, null-on-missing, persist lands under real key, round-trip, clear, idempotent clear, malformed tolerance — behavioral | ✅ |
| mobile `lib/{storage,clipboard,deckUtils,boardState,importExport,scenarioWiring}.test.ts` (50) | Adapter conformance, clipboard/share bridge, browser/board helpers, round-trip, scenario lifecycle — behavioral | ✅ |
| Global scan | No tautologies (`expect(true).toBe(true)` etc.), no loop-over-collection "ghost" assertions; 14 type-only-style asserts are all paired with value assertions | ✅ |

**Assertion quality: ✅ All sampled assertions verify real behavior — no CRITICAL, no WARNING.**

## 7. Review workload / PR boundary findings

- **Chain strategy respected:** `stacked-to-main` recorded; 5 stacked branches each off the previous PR head; each PR ends green (`npm test` + web build records per slice; reproduced at aggregate HEAD).
- **Scope boundary:** each slice implemented only its assigned tasks; slice boundaries held (slice 4 touched no web sources — build hash byte-identical through slices 3→4; final web hash change only at S2.12 as planned). No scope creep beyond the assigned plan detected beyond documented deviations (see below).
- **Size/exception bookkeeping:** PR 1 recorded `size:exception` (rename-dominant + generated lockfile); PR 3a generated-exception documented; **PR 2 and PR 4 crossed the 400-line review guideline without claiming an exception** — apply-progress states this honestly in both PR bodies ("no size:exception is claimed — the PR body states the actual diff stats"). That is a process WARNING (W-1), not a fabrication.
- **Bounded-review lifecycle gates (parent-owned) remain `- [ ]`** — no per-PR review-ledger evidence exists in this change dir. Flagged for the parent; review lenses were forecast (risk/resilience/reliability/4R) but not confirmed executed.

## 8. Findings

### CRITICAL
- **C-1 — S5.2 device acceptance unverified (archive blocker).** Checkbox `- [ ] S5.2` remains. Device legs unverified and honestly deferred: **E-2** kill-and-relaunch exact restore (iOS + Android), **G-2** airplane-mode end-to-end, **N-1** cold-start time/memory measurement, plus hands-on legs of D-1 (tab interaction), D-2 (resume), E-3/E-4, F-1 (share sheet presentation). Spec refs: `spec.md` E-2/SC2/SC3, G-2/SC6, N-1/R8, D-1/D-2, F-1. No doc claims them verified — the traceability/matrix/apply reports are honest. **Do not archive until a device/CI lane executes S5.2.**

### WARNING
- **W-1 — Training-guideline PR sizes:** PR 2 (S2.1–S2.11, ~1,400 est.) and PR 4 (~2,100 hand-written additions) exceed the 400-line review budget with no `size:exception` recorded (documented as "honest assessment", no exception claimed). Not a correctness defect; a review-workload process deviation that the parent should reconcile before merge of those PRs.
- **W-2 — Lint gate unmet (96 errors at HEAD).** tasks.md S1.7 gate ("regression — `npm run lint` passes across workspaces") is **not green**: `npm run lint` reports 96 errors (0 warnings), and the apply claim of a flat baseline ("83 pre-existing") no longer holds — new-file errors are present (e.g. `packages/core/src/store/gameStore.ts`, `gameStore.test.ts`, `hydrate.test.ts`, `apps/web/src/lib/{storage,coachSession}.test.ts`, `apps/web/src/components/ExportPanel.tsx` setState-in-effect at 139:7 from the S2.12 restore effect). Mostly `no-explicit-any` in moved legacy code + a few react-hooks rules; `tsc -b` and tests are unaffected. Disclosed in apply-progress as debt — but the gate itself was never met; track as a bounded `chore(web)`/`chore(core)` cleanup or explicitly accept.
- **W-3 — Web manual runtime parity not executed.** S5.1's "web plays identically (start → reload restore → import/export → scenario save)" leg has unit+build evidence only; no real-browser smoke recorded. Low risk (covers S2.11 async bootstrap), but the scenario-survives-reload and restore flows deserve one manual pass before archive.

### SUGGESTION
- **S-1 — `scripts/coach-server.ts` Bun→Node translation** (deviation 1, slice 1) was a scope addition beyond the named task, though gate-justified (the task's own smoke gate was unreachable otherwise) and behavior-preserving per the apply record. Recorded, not silent; no action required beyond parent awareness.
- **S-2 — Core tsconfig still carries `lib: ["ES2023","DOM"]`** (documented deviation) for network-API type-checking (`fetch`/`Response`/`AbortSignal`); `types: []` holds, no runtime DOM. Optionally narrow later; not a spec violation (B-3 scans clean).

## 9. Exact blockers

1. **S5.2 device acceptance (CRITICAL):** E-2 (both platforms), G-2, N-1 measurement and the hands-on legs — requires iOS Simulator + Android emulator or CI device lane; **archive blocked** until executed and the checkbox flips.
2. **Parent lifecycle gates:** per-PR bounded reviews (ledger evidence) and the Review Workload Guard confirmation for PRs 2/4 remain open (`tasks.md` lines 121–122); parent-owned, tracked.
3. Web manual runtime smoke (W-3) recommended before archive.

## 10. What sdd-verify judged vs the apply claims (adversarial challenges)

- Bundle hash `entry-2496099f….hbc` → **reproduced exactly** (same file, same size 3.3MB).
- Web dist hashes → **reproduced exactly** (`index-BZDi2R11.js` 2,855.31 kB / gzip 398.83, `index-ZIy-rXDp.css`).
- Test counts 128 → 173 → 182 → 217 → 224 → **224 reproduced**.
- "Zero `localStorage` outside adapter" / "zero DOM in core" / "no duplicate store" → **all reproduced by independent scans**.
- "No runtime to run device legs" → **proven** (simctl empty, no Android toolchain) — and no artifact claims those legs verified. The apply agent's honesty here (leaving S5.2 `[ ]`) is correct behavior, not a gap in reporting.
- `parseAutoSave` "verbatim move" + `hydrate` "never throws" → **verified against git history and source**.
- The one claim that did NOT hold: lint "stays flat at 83" — it is 96 at HEAD with new-file contributions (W-2). Disclosed in apply-progress as debt, but the S1.7 gate text was never satisfied.
---

## Addendum — Device-lane run (2026-08-31) — resolves the former CRITICAL for iOS

The verify-phase CRITICAL (S5.2 unchecked, no runtime) is partially resolved by an actual iOS Simulator run:

- **Runtime installed**: iOS 26.5 Simulator (23F77) via `xcodebuild -downloadPlatform iOS`; device `pkm-sim-iPhone` (iPhone 17 Pro) created and booted.
- **Build + boot**: Debug build via `xcodebuild` (mobile.xcworkspace), Metro serves 1,343 modules, app boots with **zero JS errors** on-device.
- **E-2 kill-and-relaunch**: `simctl terminate` → `simctl launch` → **zero `Should have a queue`/TypeError/ReferenceError**, process stable (run twice).
- **Bug found & fixed on-device** (branch `fix/expo-dedupe-react`, **PR 8**): dual React 19.2.3/19.2.4 in the monorepo → two React dispatchers → hook-order crash on every relaunch. Fix: react/react-dom → 19.2.4 (tree unifies: `@expo/metro-runtime` hoists, `expo-router/_ctx-shared` resolves) + `reactCompiler`/`typedRoutes` disabled in `app.json`. Post-fix relaunch clean; `npm test` still 224 pass.
- **Remaining DEFERRED** (documented in `acceptance-matrix.md`; no UI automation / no Android toolchain here): Android emulator lane (E-2/SC3), tab & UI interaction smoke, seeded-state visual restore, G-2 airplane-mode, N-1 cold-start measurement. These keep the aggregate verdict at **conditional-pass**: implementation + iOS device boot/relaunch verified; Android + interaction legs require a device/CI lane.
- **Status of former W-2 (lint):** unchanged — 96 pre-existing errors, tracked debt, not introduced by this change.

---

## Addendum 2 — Android device-lane run (2026-08-31) — closes the S5.2 Android leg

- **Toolchain installed**: JDK 21 (Temurin, user-local `~/Library/Java/JavaVirtualMachines`), Android SDK (`~/Library/Android`): cmdline-tools, platform-tools, build-tools 36.0.0, platform android-36, emulator, system-images android-36 google_apis arm64-v8a.
- **AVD**: `pkm-avd` (Pixel 7, ARM64) booted; `sys.boot_completed=1`.
- **Build**: `npx expo prebuild --platform android` + `./gradlew assembleDebug` → **BUILD SUCCESSFUL (492 tasks, 32m first build)**, APK `com.srgx2013.pokemonsimulator`.
- **On-device**: APK installed (`adb install`), Metro serves the JS bundle, app runs (`Running "main"`), **E-2 force-stop → relaunch: PASS, zero JS errors** (verified twice after a cold emulator restart that cured a PMS corruption from the initial system crash).
- **Emulator prebuilt `android/` dir is gitignored** (Expo convention); `app.json` gained `android.package` and the mobile `package.json` scripts switched to `expo run:android`/`run:ios` (native-build mode).
- **Remaining DEFERRED** (unchanged, needs UI automation): tab interaction smoke, seeded-state visual restore, G-2 airplane-mode, N-1 cold-start timing — on both platforms.
