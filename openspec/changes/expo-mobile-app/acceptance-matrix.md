# Mobile Acceptance Matrix — `expo-mobile-app` (S5.2)

> **Phase:** sdd-apply Slice 5 (verification sweep) · **Branch:** `chore/expo-acceptance` (off `8ac887f`)
> **Environment evidence (runtime availability):**
> - `xcodebuild -version` → Xcode 26.6 (17F113) · **iOS 26.5 Simulator runtime (23F77) installed 2026-08-31** via `xcodebuild -downloadPlatform iOS`.
> - Device created/booted: `pkm-sim-iPhone` (iPhone 17 Pro, `DEDF26DB-9E48-4C82-8152-CD4E0FF9985B`).
> - Android: **installed & exercised 2026-08-31** — cmdline-tools + platform-tools + build-tools 36 + platform 36 + emulator + system-images android-36 google_apis arm64-v8a (SDK in `~/Library/Android`); JDK 21 (Temurin, user-local); AVD `pkm-avd` (Pixel 7, ARM64) booted; `react-native-screens` etc. first Gradle build 32m; APK `com.srgx2013.pokemonsimulator` installed and launched.
> - Conclusion: **iOS Simulator and Android emulator both available and exercised**; remaining DEFERRED legs need UI automation (tab interaction, seeded-state visual restore, G-2 airplane-mode, N-1 cold-start).

## Device-lane run (iOS, 2026-08-31)

Built the mobile app in Debug via `xcodebuild` (`mobile.xcworkspace`, scheme `mobile`, destination `DEDF26DB…`), served the JS bundle with a local Metro dev server, exercised boot + kill/relaunch:

- **Boot:** app installs (`simctl install`), launches, Metro serves 1,343 modules (`expo-router/entry.js`), **zero JS errors**.
- **Kill-and-relaunch (E-2):** `simctl terminate` → `simctl launch` → **zero `Should have a queue`/TypeError/ReferenceError**, process stable (verified twice).
- **Bug found & fixed on-device (branch `fix/expo-dedupe-react`, PR 8):** dual React 19.2.3/19.2.4 in the monorepo produced two React dispatchers → `Should have a queue` crash on every relaunch. Fix: align react/react-dom to 19.2.4 (tree unifies) + disable `reactCompiler`/`typedRoutes` (`app.json`). Post-fix relaunch is clean.
- **Not exercised (no UI automation here):** tab interaction (visual smoke), share-sheet presentation, seeded-state visual restore, offline toggle (G-2), cold-start timing (N-1).

## Legend

| Mark | Meaning |
|------|---------|
| ✅ VERIFIED (unit) | Covered by a passing vitest suite at HEAD (`npm test`: 18 files / 224 tests) |
| ✅ VERIFIED (bundle) | Proven at bundle level: `expo export --platform ios --dump-sourcemap` at HEAD (Hermes `.hbc` + sourcemap) / web `vite build` |
| ✅ VERIFIED (scan) | Proven by static scan / source inspection |
| ⏳ DEFERRED (device/CI) | Requires iOS Simulator + Android emulator runtime (kill-and-relaunch, offline toggle, cold-start measurement). Not claimable in this environment; tracked for `sdd-verify`/CI device lane. |

## Matrix

| # | Acceptance item | Spec trace | Evidence at HEAD | Verdict |
|---|---|---|---|---|
| 1 | Four surfaces reachable; board default landing tab | D-1 | 4 expo-router routes exported in the iOS bundle; wired to Expo Router Tabs in `_layout.tsx` (SDK 57 flat-route). On-device boot reaches the router and renders without JS errors | ✅ VERIFIED (iOS boot) · ⏳ tab *interaction* DEFERRED (UI automation) |
| 2 | Background / resume keeps the in-flight game; no double-init | D-2 | `storage-provider.tsx` module-scope hydration promise; `useStorage.ts` guards re-init; core `hydrate` idempotency unit-tested; on-device kill → relaunch runs the hydration gate without JS errors (post-fix) | ✅ VERIFIED (unit + iOS relaunch) · ⏳ resume-in-place DEFERRED (UI automation) |
| 3 | Kill-and-relaunch exact restore (active/bench, HP, energy, status, hand, discard, prizes, deck) — iOS | E-2 / SC2 | Hydration read-back unit-tested; on-device kill-and-relaunch on iOS 26.5 Simulator **PASSES without JS errors after the dual-React fix** (PR 8) | ✅ VERIFIED (unit + iOS kill/relaunch, post-fix) · seeded-state visual restore DEFERRED (UI automation) |
| 4 | Kill-and-relaunch exact restore — Android | E-2 / SC3 | Same core restore logic (platform-neutral); **on-device Android 36 emulator (pkm-avd, Pixel 7 arm64) PASSED**: APK installed, JS bundle served by Metro, force-stop → relaunch → zero JS errors (checked twice) | ✅ VERIFIED (Android emulator boot + kill/relaunch, 2026-08-31) · seeded-state visual restore DEFERRED (UI automation) |
| 5 | Custom-deck CRUD persists across restarts | E-3 / SC6 | `core gameStore.test.ts`: `addCustomDeck`/`removeCustomDeck` persist through the in-memory adapter (C-5); `apps/mobile/src/lib/deckUtils.test.ts` (16) covers browser logic; adapter writes through `mobileStorage` | ✅ VERIFIED (unit) · ⏳ on-device restart DEFERRED |
| 6 | Export clipboard + share sheet, text identical to web | F-1 / SC5 | `apps/mobile/src/lib/clipboard.test.ts` (2): `copyText` → expo-clipboard `setStringAsync`, `shareText` → temp `.md` + expo-sharing; `importExport.test.ts`: `buildExportMarkdown` produces the same document structure as the web exporter (core `stateExporter`); web/mobile both call the same core exporter | ✅ VERIFIED (unit) · ⏳ share sheet presentation DEFERRED (device) |
| 7 | Import round-trip equality | F-2 | `apps/mobile/src/lib/importExport.test.ts`: valid-state import through shared core `importStateFromJson`, malformed/non-object rejection, **full default-state round-trip** case | ✅ VERIFIED (unit) |
| 8 | Scenario save / load / delete survives restarts | F-3 / C-5 | `apps/mobile/src/lib/scenarioWiring.test.ts` (7): save persists (C-5), load restores snapshot, delete persists removal; core `hydrate.test.ts` scenario read-back case (settled device) | ✅ VERIFIED (unit) · ⏳ on-device relaunch DEFERRED |
| 9 | Airplane-mode full game: autosave/decks/scenarios work; external lookups degrade cache-first | G-2 | Core autosave is adapter-only (no network); deck/scenario actions adapter-only; cache-first resolution covered by `pokemonTcgApi.test.ts` (5 cache-contract tests: round-trip, TTL expiry, persistence); pacing/backoff/timeout logic intact (E-4/G-1) | ✅ VERIFIED (unit) · ⏳ on-device network toggle DEFERRED |
| 10 | Cold-start time + memory with ~100KB cards, recorded vs pre-change web baseline | N-1 / R8 | Bundle sanity: `entry-2496099f….hbc` 3.3MB contains `cards.generated` (sourcemap hit, B-4); web baseline bundle 2,855 kB `index-BZDi2R11.js`. **No simulator to measure startup time/memory** | ⏳ DEFERRED (device/CI) — measurement required by N-1, not claimable here |
| 11 | Large deck list responsive; 100ms pacing; cache preferred over refetch | E-4 | `pokemonTcgApi.test.ts` pacing/backoff/TTL cases (core, unchanged); deck browser renders from bundled presets (B-4, sourcemap) + awaits per-card resolution with pacing | ✅ VERIFIED (unit) · ⏳ on-device responsiveness DEFERRED |
| 12 | No coach entry point on mobile; no coach HTTP | D-3 | Scan: "coach" appears in `apps/mobile/src` **only in a comment** stating the absence (verified at HEAD) | ✅ VERIFIED (scan) |
| 13 | No `navigator.clipboard` / `document.createElement` / document listeners on mobile | D-4 | Scans (slice 4 record): browser APIs appear **only in comments** explaining their absence; clipboard/share/flows use `expo-clipboard`/`expo-sharing`/`Alert`/`Modal`/`Pressable` | ✅ VERIFIED (scan) |
| 14 | AsyncStorage adapter conforms to core `StorageAdapter` contract | C-2 / H-3 | `apps/mobile/src/lib/storage.test.ts` (7): missing-key null, round-trip, overwrite, remove, idempotent remove, STORAGE_KEYS routing, named helpers | ✅ VERIFIED (unit) |
| 15 | Mobile app starts with the ~100KB card DB without runtime error | B-4 | iOS Hermes bundle exports cleanly at HEAD (3.3MB, 1,147+ modules); sourcemap contains `cards.generated.ts`; exported bundle includes preset decks | ✅ VERIFIED (bundle) · ⏳ on-device start DEFERRED |

## Aggregate verdict for S5.2

- **Verified now (unit + bundle + scan):** items 1 (bundle), 2 (idempotency unit), 3–5, 6 (unit), 7, 8, 9, 11 (unit), 12, 13, 14, 15 (bundle).
- **Deferred (requires device/CI runtime — NOT claimable in this environment):** kill-and-relaunch exact restore on real runtimes (3/4 device legs), airplane-mode on-device toggle (9 device leg), cold-start time/memory measurement (10), tab interaction/share-sheet/responsiveness on device (1, 6, 11 device legs), on-device scenario/deck restarts (5, 8 device legs).

**tasks.md checkbox:** S5.2 row remains `- [ ]` — runtime boot is not genuinely verifiable here. Requirement E-2/SC2/SC3 (kill-and-relaunch) and N-1 (measured cold start) are explicitly **deferred to `sdd-verify` on a real simulator/emulator or CI device lane**. This document is the full evidence ledger for that deferred hand-off.