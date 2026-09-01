# Expo Mobile App — Specification

> **Change:** `expo-mobile-app`
> **Status:** Specified
> **Inputs:** `proposal.md` (authoritative scope), `explore.md` (coupling inventory)
> **Scope guard:** every requirement below traces to proposal sections (§3–§7) and success criteria (SC1–SC8). This spec describes WHAT must be true after the change; implementation structure, file layout, and tooling choices belong to design. Anything absent from the proposal and this spec is out of scope (see the closing Non-Goals list).

## Purpose

Deliver iOS/Android playback of the Pokémon TCG scenario simulator by extracting a platform-agnostic shared core (`@pokemon-simulator/core`), abstracting all persistence behind a single async `StorageAdapter`, converting store initialization to explicit async hydration, and building a mobile-first Expo app (expo-router) that shares the same rules, data, and import/export code as the existing web SPA — while keeping the web app's behavior and deployability unchanged.

---

## A. Repository & Workspace Structure

### Requirement: A-1 — npm workspaces monorepo

The repository MUST be reorganized as an npm workspaces monorepo containing a `packages/*` group (shared libraries, starting with the core package) and an `apps/*` group (the existing web SPA and the new mobile app). Root artifacts REQUIRED by the restructure — root `package.json`, `tsconfig.base.json`, and `vitest.workspace.ts` — MUST exist and be recognized by the tooling.

(Trace: §3.2, §5.4; SC1, SC4)

#### Scenario: Workspace install and build

- GIVEN a clean checkout of the monorepo
- WHEN the workspace install and root build commands run
- THEN all three workspaces (core, web, mobile) resolve and build
- AND no workspace falls back to standalone (non-workspace) resolution

### Requirement: A-2 — npm as package manager of record

Dependency install MUST resolve through npm: a single committed `package-lock.json` MUST replace `bun.lock` as the lockfile for workspace installs, and the root scripts required for build, test, and deploy MUST remain invocable via `npm run`. The proposal explicitly flags the `bun.lock` → `package-lock.json` migration as a deliberate call with real cost; whether `bun` remains available as a script runner is a design/task decision and MUST NOT weaken the spec-level guarantee above.

(Trace: §5.4, §6.2, §9)

#### Scenario: Reproducible installs

- GIVEN the committed npm lockfile
- WHEN a contributor runs `npm install` and then the root test command
- THEN dependency resolution succeeds without `bun.lock`
- AND the install is reproducible from `package-lock.json` alone

### Requirement: A-3 — Shared strict TypeScript configuration

The repository MUST provide a root `tsconfig.base.json` that the core package and both apps inherit, preserving the project's existing strictness: `strict`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`. All workspace sources MUST compile under this shared configuration; no workspace MAY disable these flags.

(Trace: §3.2, §5.4; config.yaml conventions)

#### Scenario: Strict compilation across workspaces

- GIVEN the shared base configuration
- WHEN the type-check step runs across all workspaces
- THEN every workspace type-checks under the shared strict settings
- AND type-only imports stay enforced (`verbatimModuleSyntax`)

### Requirement: A-4 — One test entry point for all workspaces

`npm test` at the repository root MUST aggregate and execute every workspace test suite through `vitest.workspace.ts` and exit 0 only when all suites pass (Strict TDD test command remains `npm test`).

(Trace: §5.4, §5.6; SC1)

#### Scenario: Root test run

- GIVEN changes in both the core and web workspaces
- WHEN `npm test` runs at the repository root
- THEN both workspace suites execute under vitest aggregation
- AND the exit code is 0 on full pass, non-zero on any failure

### Requirement: A-5 — Web app stays independently deployable

After the restructure the web app MUST keep its current behavior and deployment pipeline: the root build MUST still produce the same deployable static output, the Cloudflare Worker configuration MUST remain web-scoped with unchanged behavior, and the web app MUST be deployable independently at every commit (rollback isolation per the proposal's ordering safeguard).

(Trace: §6.1, §8; SC4)

#### Scenario: Web deploy parity

- GIVEN the monorepo restructure completed
- WHEN the web build runs and the web deploy step is invoked
- THEN the produced bundle deploys as a static Cloudflare SPA exactly as before the change
- AND the web app plays identically (start game, autosave reload restore, import/export, scenario save)

---

## B. Shared Core Extraction (`@pokemon-simulator/core`)

### Requirement: B-1 — Core package with zero-change modules

A shared package `@pokemon-simulator/core` MUST exist and contain the previously verified pure-TS modules — types, preset decks data, the generated card database, `stateExporter`, `stateImporter`, `promptGenerator` — moved with ZERO behavioral change. Their seven colocated existing test suites MUST move with them and serve as the extraction regression net.

(Trace: §3.2, §5.1; SC1)

#### Scenario: Zero-change extraction regression

- GIVEN the core package containing the moved modules and their colocated tests
- WHEN the root test command runs
- THEN the moved suites pass unchanged against the moved sources
- AND the modules' observable inputs/outputs are identical pre- and post-move

### Requirement: B-2 — Store and API service move with adapter injection

The game store and the Pokemon TCG API service MUST move into core as the only two modules changing behavior, and every behavioral change on them MUST be limited to persistence through the injected adapter (Section C). The web app MUST consume these modules via `@pokemon-simulator/core` imports, with no duplicate store or API logic left in `apps/web`.

(Trace: §5.1, §5.2, §5.3, §9)

#### Scenario: Web consumes the shared store

- GIVEN the web app importing store and API service from the core package
- WHEN the app starts, plays a game, and autosaves
- THEN web behavior is identical to the pre-extraction app
- AND inspection finds no second copy of store or API logic in `apps/web`

### Requirement: B-3 — Core public surface is platform-agnostic

The core package MUST export only its public surface (store factory, services, types, data) and MUST NOT depend on or expose DOM/renderer APIs: `react-dom`, `react-markdown`/`remark-gfm`, CSS, and `window`/`document` types MUST NOT enter core sources or public type exports.

(Trace: §5.1; explore §6.2/§6.3; SC7)

#### Scenario: DOM-free boundary

- GIVEN the built core package
- WHEN the core dependency graph and exported types are inspected
- THEN no DOM/renderer reference exists in core sources or public exports
- AND neither app receives renderer-related types from core

### Requirement: B-4 — Generated card database ships as-is

The ~100KB generated card database MUST ship in the bundle unchanged; lazy-loading from JSON assets, SQLite, or any optimization of it is a declared non-goal for this change. Both web and mobile bundles MUST load it without runtime error.

(Trace: §4, §5.1; explore §7; SC8)

#### Scenario: Bundle load sanity

- GIVEN the mobile bundle including the generated card data
- WHEN the app starts and preset decks render in the deck browser
- THEN the card data loads without runtime error
- AND no startup regression attributable to the data file is observed in the simulator

---

## C. Persistence Abstraction & Async Hydration

### Requirement: C-1 — Single async StorageAdapter boundary for all persistence

All persistent state MUST flow through one async interface exposing `getItem(key): Promise<string | null>`, `setItem(key, value): Promise<void>`, and `removeItem(key): Promise<void>`. All 7 existing keys — `pokemon-autosave`, `pokemon-custom-decks`, `pokemon-scenarios`, `pokemon-data-version`, `pokemon_tcg_cache`, `tcgdex_cache`, `pokemon-coach-session` — MUST be accessed only through implementations of this interface. The core package MUST contain zero direct `localStorage`/`AsyncStorage` references outside the adapter implementations.

(Trace: §5.2; explore §1.1–1.6; SC7)

#### Scenario: All keys flow through the adapter

- GIVEN the core package with an in-memory adapter
- WHEN a full session runs (autosave, custom-deck CRUD, scenario save, API cache read/write)
- THEN every key access is observable solely through the adapter
- AND a scan of core sources finds no direct `localStorage` or `AsyncStorage` usage

### Requirement: C-2 — One adapter implementation per platform

The web app MUST provide a `localStorage`-based adapter and the mobile app MUST provide an AsyncStorage-based adapter; both MUST satisfy the same interface as the core's in-memory test implementation, and the web path MUST be async-safe (no synchronous storage access at import time).

(Trace: §5.2; explore §1.1, §2)

#### Scenario: Interface conformance across platforms

- GIVEN the web, mobile, and in-memory adapter implementations
- WHEN each is driven through an identical get/set/remove sequence
- THEN all three produce equivalent results through the common interface
- AND the web implementation exposes asynchronous semantics (Promise-based) like the others

### Requirement: C-3 — Explicit async hydration replaces module-level init

The store MUST NOT read or write storage at module load time. State initialization MUST be an explicit async hydration step executed once before first render — skeleton → hydrate → render — which reads autosave and custom decks, runs the data-version migration, and seeds store state. The custom multi-key persistence design MUST be preserved; migration to `zustand/persist` middleware is out of scope.

(Trace: §5.3; explore §1.1, §2; SC1–SC4)

#### Scenario: First-boot hydration order

- GIVEN a device with a stored game under `pokemon-autosave`
- WHEN the app launches
- THEN the app shell renders a skeleton until hydration completes
- AND the stored game state is seeded before any gameplay surface becomes interactive

#### Scenario: No storage access at import

- GIVEN a fresh module scope
- WHEN the store module is imported
- THEN no storage read or write occurs at import time
- AND storage access happens only during explicit hydration or action execution

### Requirement: C-4 — Async data-version migration in core

The data-version check and migration MUST live in core as an async step over the adapter and MUST complete before state seeding. It MUST tolerate stale or malformed stored data — never throwing, preserving the legacy-storage tolerance of today's `loadAutoSave` — and MUST be idempotent across launches and app resumes.

(Trace: §5.3; explore §1.2, §6.3; SC1)

#### Scenario: Legacy stored data migration

- GIVEN stored data written under the previous format with an older `pokemon-data-version`
- WHEN hydration runs the migration
- THEN the stored data is upgraded to the current format without loss
- AND the version key is updated through the adapter

#### Scenario: Malformed autosave tolerance

- GIVEN a `pokemon-autosave` value that is corrupted or not valid JSON
- WHEN hydration reads it
- THEN the app boots to a clean initial state instead of throwing
- AND the web app exhibits the same tolerance

### Requirement: C-5 — Async persistence of autosave and manual actions

Autosave MUST persist through the adapter asynchronously after state changes (fire-and-forget subscription), and the manual persistence actions — add custom deck, remove custom deck, load custom decks, save scenario, delete scenario — MUST be async and persist through the adapter.

(Trace: §5.3; explore §2; SC2, SC5, SC6)

#### Scenario: Rapid autosave writes

- GIVEN rapid consecutive state changes (e.g., damage and energy in quick succession)
- WHEN the autosave callback fires per change
- THEN writes are last-write-wins per key with the latest state eventually persisted
- AND no write throws or is unrecoverably lost (storage serializes per key)

### Requirement: C-6 — Empty-storage first-run behavior

With none of the 7 keys present, hydration MUST seed a clean default state (fresh game, empty custom-deck list) and the app MUST be fully playable with no storage errors and no user intervention.

(Trace: §6.3; SC2, SC3)

#### Scenario: First launch on a fresh device

- GIVEN a device with empty storage
- WHEN the app launches and hydration completes
- THEN the game board renders in its default state and is playable
- AND no storage-related error or alert is presented

---

## D. Mobile App Shell & Navigation

### Requirement: D-1 — Expo app with file-based navigation

The mobile app MUST be an Expo app on the latest stable SDK (SDK 53 baseline: New Architecture, Hermes) using expo-router, exposing exactly four surfaces through tab/file-based navigation: game board, deck browser, export, and scenario editor. No surface MAY require a desktop browser or local server.

(Trace: §3.2, §5.5; explore §4.2)

#### Scenario: Four surfaces reachable

- GIVEN the app running in the iOS Simulator
- WHEN the user navigates the tab bar across all tabs
- THEN game board, deck browser, export, and scenario editor are all reachable
- AND the game board is the default landing surface

### Requirement: D-2 — Hydration gate in the app shell

The mobile shell MUST gate first render on hydration: a skeleton while unhydrated and the real app after hydrate completes. A resumed (backgrounded) app MUST NOT double-initialize, lose the in-flight game, or block on a second hydration.

(Trace: §5.3, §6.3; SC2, SC3)

#### Scenario: Background and resume keeps the game

- GIVEN an in-progress game with autosaved state
- WHEN the app is backgrounded and later resumed
- THEN the game continues from the current state without re-hydration or state reset

### Requirement: D-3 — No coach UI on mobile

The mobile app MUST NOT expose the coach feature for this change: no coach entry point in the UI and no coach HTTP calls. The web app MUST keep its coach behavior unchanged.

(Trace: §4, §6.2; explore §6.4)

#### Scenario: Coach absent from mobile

- GIVEN the mobile app
- WHEN the user explores every surface
- THEN no coach analysis entry point is visible
- AND no request targets a coach server URL

### Requirement: D-4 — Platform-native replacements for browser APIs

The mobile app MUST replace browser-only interaction APIs with RN-native equivalents: confirmations via `Alert`, text prompts via input modals, clipboard via `expo-clipboard`, backdrops/overlays via `Pressable`/`Modal` instead of document listeners and portals. Correctness MUST NOT depend on browser CORS, `beforeunload`, Vite HMR, or any other browser-only behavior.

(Trace: §5.5; explore §1.3–1.5, §3, §6.3, §6.4)

#### Scenario: Copy export on device

- GIVEN the export surface on mobile
- WHEN the user requests copy-to-clipboard
- THEN the exported text is written through `expo-clipboard`
- AND no `navigator.clipboard` or `document.createElement` clipboard fallback is used

---

## E. Gameplay UI Screens

### Requirement: E-1 — Full game board with parity of interactions

The mobile game board MUST support the same set of gameplay interactions the web app supports, with rule logic provided by the shared core (identical rules, not identical UI): start game, place Pokémon from deck to active/bench, add/remove energy, add damage, set status, view hand/discard/prizes/deck, swap players, reset. The board is a mobile-first redesign; visual parity with the web UI is explicitly NOT required.

(Trace: §3.1.1, §4; SC2, SC3)

#### Scenario: Complete battle interaction loop

- GIVEN a started game on the mobile board
- WHEN the user places a Pokémon, attaches energy, applies damage, and sets a status
- THEN the board reflects the state computed by the same core rules as the web app
- AND swap players and reset behave identically in state terms

### Requirement: E-2 — Exact autosave/restore across relaunch

Starting a game, autosaving, then killing and relaunching the app MUST restore the exact game state — active/bench, HP, energy, status, hand, discard, prizes, deck — on both iOS and Android.

(Trace: §7; SC2, SC3)

#### Scenario: Kill-and-relaunch restore

- GIVEN an in-progress game after several interactions
- WHEN the app is killed and relaunched
- THEN the board restores the exact pre-kill state with no missing or extra changes

### Requirement: E-3 — Deck browser: presets plus custom CRUD

The deck browser MUST show built-in presets from core data and support custom deck add/remove, persisted through the adapter and surviving app restarts.

(Trace: §3.1.3; SC6)

#### Scenario: Custom deck persistence across restarts

- GIVEN a custom deck added on mobile
- WHEN the app is restarted
- THEN the custom deck is still listed
- AND removing it persists the removal across another restart

### Requirement: E-4 — Large deck list tolerance

The deck browser and card views MUST remain responsive with large decks and long preset lists: sequential card fetches MUST keep the existing 100ms pacing, and cached card data MUST be preferred over re-fetching to limit mobile data usage.

(Trace: §6.3; explore §3.1; SC6)

#### Scenario: Large deck browsing stays responsive

- GIVEN a deck list containing many cards
- WHEN the user browses it in the simulator
- THEN the UI stays responsive while card details resolve
- AND previously fetched card data is served from cache instead of the network

---

## F. Import/Export

### Requirement: F-1 — Export via clipboard and share sheet

The mobile app MUST export the current game state as markdown/text through `expo-clipboard` and MUST offer file/share export through `expo-sharing` (share sheet / save to Files), both produced by the shared core exporter so the output is identical to the web app's.

(Trace: §3.1.2, §10 assumption 2; SC5)

#### Scenario: Mobile and web export identical

- GIVEN the same game state on web and mobile
- WHEN export runs on both platforms
- THEN the exported markdown text is identical (same core `stateExporter`)

#### Scenario: Share sheet export

- GIVEN the export surface on mobile
- WHEN the user chooses file/share export
- THEN `expo-sharing` presents the share sheet with the exported payload
- AND the payload is the same text produced by clipboard export

### Requirement: F-2 — Import round-trip equality

The mobile app MUST import game state from clipboard text and restore an identical state — round-trip equality through the same core `stateImporter` used by the web app.

(Trace: §3.1.2; SC5)

#### Scenario: Round-trip restore

- GIVEN an exported state text on the device clipboard
- WHEN the user imports it on mobile
- THEN the restored state is identical to the exported state
- AND the same round trip on web yields the same restored state

### Requirement: F-3 — Scenario save, load, delete

The mobile app MUST support saving the current game as a named scenario, loading a saved scenario, and deleting it; scenarios MUST persist through the adapter and survive app restarts.

(Trace: §3.1.2; explore §1.1; SC5)

#### Scenario: Scenario lifecycle across restart

- GIVEN a saved scenario persisted on the device
- WHEN the app restarts and the user loads it
- THEN the game restores to the saved state
- AND deleting the scenario removes it from storage permanently

---

## G. External API on Mobile

### Requirement: G-1 — Card resolution with backoff, pacing, and timeout

The mobile app MUST resolve external deck lists and card images through the shared `pokemonTcgApi` service with its existing behavior: pokemontcg.io primary, tcgdex.net fallback, exponential backoff (1.5s/3s/6s), sequential-request pacing, caching with 24h TTL, and an 8s timeout that MUST work on Hermes (SDK 53 provides `AbortSignal.timeout`; a `setTimeout`/`AbortController` fallback inside the core service MAY be used if needed).

(Trace: §3.1.3; explore §3.1/§3.2; §6.2; SC6)

#### Scenario: External deck list resolution and cache hit

- GIVEN a custom deck containing API-resolved card IDs
- WHEN the deck browser resolves them with the primary API available
- THEN cards appear with images
- AND a second load within 24h serves from cache without network access

#### Scenario: Fallback when primary fails

- GIVEN the primary API failing for a card
- WHEN resolution runs
- THEN the tcgdex.net fallback is attempted with the existing backoff
- AND repeated failure surfaces a graceful, non-blocking error state

### Requirement: G-2 — Offline tolerance end-to-end

The mobile app MUST boot, autosave, manage custom decks and scenarios, and play a full game with zero network connectivity; only external card lookups degrade (cache-first with graceful failure), and correctness MUST NOT depend on CORS behavior.

(Trace: §6.3; SC6)

#### Scenario: Airplane-mode gameplay

- GIVEN the app running with network disabled
- WHEN the user launches it and plays a game
- THEN gameplay, autosave, custom decks, and scenarios all work
- AND no unhandled network error blocks or crashes the UI

---

## H. Tests Across Workspaces

### Requirement: H-1 — Core suites intact plus new storage tests

The seven existing vitest suites MUST move with their sources and pass unchanged after extraction. New tests MUST cover: in-memory adapter conformance, web adapter against a `localStorage` mock, hydration order, migration behavior, and legacy-format tolerance — all living in the core workspace.

(Trace: §5.6; SC1)

#### Scenario: Regression net after extraction

- GIVEN moved core sources with their colocated tests
- WHEN `npm test` runs at the root
- THEN the seven original suites pass unchanged
- AND the new storage/hydration/migration suites pass

### Requirement: H-2 — Strict TDD for core behavior changes

Storage abstraction and hydration logic MUST be written test-first in the core workspace (red-green-refactor); every core behavior change MUST ship with passing tests under `npm test`.

(Trace: §5.6; config.yaml strict_tdd)

#### Scenario: Failing-first hydration test

- GIVEN a new hydration or storage behavior to implement
- WHEN its tests are written before the implementation
- THEN the test fails initially, passes after implementation, and remains green afterward

### Requirement: H-3 — Mobile test scope: unit-only, no second framework

The mobile workspace MUST unit-test only pure logic and the thin platform bridge (AsyncStorage adapter/wrapper) under vitest with RN mocks. Introducing jest-expo or another UI test framework for this change is out of scope; mobile UI acceptance is verified in the iOS Simulator and Android emulator per the acceptance criteria.

(Trace: §5.6, §10 assumption 5)

#### Scenario: Mobile adapter unit test

- GIVEN the AsyncStorage adapter implementation
- WHEN its unit tests run under vitest with RN mocks
- THEN get/set/remove behavior conforms to the `StorageAdapter` contract

---

## N. Cross-Cutting Non-Functional Requirements

### Requirement: N-1 — Startup and bundle sanity

The mobile app MUST start with the ~100KB generated card data in the bundle without runtime error, and MUST show no startup time or memory regression relative to the pre-change web baseline as measured in the simulator (measured, not assumed).

(Trace: §7 SC8)

#### Scenario: Cold-start measurement

- GIVEN the mobile build including the generated card data
- WHEN the app cold-starts in the simulator
- THEN the shell and board render without runtime error
- AND startup time/memory stay within the accepted baseline and are recorded for verification

---

## Edge Case Coverage

The implementation MUST handle each of the following edge cases; the requirement that covers it is cited:

| Edge case | Covered by |
|-----------|-----------|
| Empty storage / first-run boot | C-6 |
| Legacy stored data migration from v1 keys | C-4 |
| Malformed/corrupt autosave (never throws) | C-4 |
| Rapid autosave writes (last-write-wins) | C-5 |
| Offline API call (cache-first, backoff, graceful failure) | G-1, G-2 |
| Large deck list render (pacing + cache preference) | E-4 |
| App background/resume (idempotent hydration, no double-init) | D-2 |
| Import of malformed/invalid exported text | F-2 (must use the same `stateImporter` and import flow as web — behavior parity, no new tolerance contract invented) |

## Acceptance Criteria

How `sdd-verify` checks each section:

| Section | Acceptance criteria | Verification method |
|---------|--------------------|--------------------|
| A (workspace) | Workspaces resolve; single npm lockfile; root `npm test` aggregates; web build + wrangler deploy succeed from the monorepo | Run root install/build/test; inspect lockfile and `vitest.workspace.ts`; run web deploy smoke |
| B (core) | 7 moved suites pass unchanged; extended suites pass; core has no DOM deps/types; no duplicated logic in web | `npm test`; static scan of core imports/exports; grep `apps/web` for duplicate store/API modules |
| C (storage) | All 7 keys via adapter; no direct storage in core; hydration before render; migration tolerant and idempotent | Static scan; new core tests; scenario checks on web and mobile |
| D (shell/nav) | Four surfaces reachable; skeleton gate; resume keeps game; no coach; no browser APIs | iOS Simulator + Android emulator manual checks (evidence-gated) |
| E (gameplay UI) | Full interaction loop; kill-and-relaunch exact restore; deck CRUD persists; large lists responsive | Simulator manual checks; persistence assertions |
| F (import/export) | Clipboard + share export; round-trip equality; scenario lifecycle | Simulator manual checks; core round-trip unit tests |
| G (external API) | Resolution with cache hit; fallback + backoff; airplane-mode gameplay | Simulator manual checks with network toggled; existing core API tests |
| H (tests) | Root `npm test` exits 0 across core and web; mobile adapter unit tests green | `npm test`; workspace test report |
| N (non-functional) | Strict TS across workspaces; bundle loads without error; no startup regression | `tsc` across workspaces; simulator cold-start measurement |

## Out of Scope (MVP Non-Goals)

Guards for `sdd-verify` — none of these are required or expected by this change:

- No coach feature on mobile (absent UI, no requests); web keeps coach.
- No multi-device sync, accounts, or backend/KV sync; persistence stays per-device.
- No monetization (IAP, paywalls).
- No web UI parity on mobile; CSS and `react-markdown`/`remark-gfm` are not ported.
- No card database optimization; `cards.generated.ts` ships in the bundle as-is.
- No web-app feature or visual changes beyond mechanical core extraction and async hydration.
- No app-store pipeline (no signing, TestFlight, or store submission); simulator/Expo Go verification only.
- No `zustand/persist` migration; custom multi-key persistence is preserved.
- No jest-expo or UI component test framework for mobile in this change.