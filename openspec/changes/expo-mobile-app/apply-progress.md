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