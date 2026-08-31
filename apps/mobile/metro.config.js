// metro.config.js — Expo Metro inside the npm-workspaces monorepo (design §2b,
// adapted to Expo SDK 57 / Metro 0.84).
//
// The repo is an npm-workspaces monorepo: `packages/core` (shared TS source) and
// `apps/web` + `apps/mobile`. `@pokemon-simulator/core` ships raw TypeScript via
// its package.json `exports` map, so Metro must (a) watch the workspace root so
// `packages/core` is part of the graph, (b) resolve the hoisted root
// `node_modules`, and (c) honor package `exports`.
//
// SDK 57 / Metro 0.84 deltas vs the SDK 53-era recipe:
// - `resolver.unstable_enablePackageExports` defaults to `true` in Metro ≥ 0.79;
//   package-exports resolution is on without setting it.
// - `resolver.unstable_enableSymlinks` was removed from Metro; symlink-aware
//   resolution for monorepos is always enabled — there is no flag to set.
// Both facts are verified against the installed metro-config@0.84.5 defaults.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so `packages/core` (outside the app root but part
// of the bundle graph) is watched/transpiled. Expo's user-config loader
// prepends `projectRoot` when it is missing, so both roots end up watched.
config.watchFolders = [workspaceRoot];

// Deps are hoisted to the repo-root node_modules; app-local node_modules holds
// the unhoisted (nested) copies — e.g. react@19.2.3 for RN 0.86.3 vs the root's
// 19.2.4 — so the app dir MUST be searched first to avoid shadowing them with
// the root copies. Expo's own getModulesPaths() uses the same order.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;