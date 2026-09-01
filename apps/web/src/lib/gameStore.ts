import { createGameStore } from '@pokemon-simulator/core';
import type { GameStoreApi } from '@pokemon-simulator/core';
import { webStorage } from './storage';

/**
 * The single web store instance shared by every component. Created at module
 * load with an EMPTY default state (spec C-3: no storage access at import —
 * the factory never touches the adapter; only hydrate() and actions do).
 * main.tsx hydrates it once before the first render and the web app renders a
 * skeleton until that completes.
 */
export const useGameStore: GameStoreApi = createGameStore(webStorage);