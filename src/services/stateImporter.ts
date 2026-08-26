/**
 * StateImporter — importa el estado de juego desde JSON estructurado.
 *
 * Es el inverso de `stateExporter.ts` para el Camino A: una IA (o el usuario)
 * entrega un JSON con el estado de la partida y este módulo lo convierte en un
 * `GameState` válido para cargarlo en el tablero.
 *
 * Funciones puras: no dependen de React, Zustand ni el DOM. La resolución de
 * cartas contra la Pokémon TCG API (imágenes, ataques reales) es una capa
 * posterior; acá se construyen cartas con los datos provistos y defaults sanos.
 *
 * Formato de entrada (JSON):
 * {
 *   "turn": 3,
 *   "currentPlayer": "player1",
 *   "player1": {
 *     "active": { "name": "Charizard ex", "hp": 330, "currentHp": 210,
 *                 "attachedEnergy": ["fire"], "status": "none" },
 *     "bench": [{ "name": "Pidgey", "hp": 60 }],
 *     "hand": [{ "name": "Professor's Research", "kind": "trainer" }],
 *     "prizes": 4,                    // número (cartas desconocidas) o lista de nombres
 *     "discard": ["Rare Candy"],
 *     "deck": [{ "name": "Pidgey", "kind": "pokemon", "hp": 60 }]
 *   },
 *   "player2": { ... }
 * }
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  PlayerState,
  PokemonInstance,
  PokemonCard,
  TrainerCard,
  EnergyCard,
  PokemonStage,
  StatusCondition,
  EnergyType,
  Attack,
  Ability,
} from '../types';

// ─── Tipos del formato de importación ──────────────────────────────────────────

export type ImportCardKind = 'pokemon' | 'trainer' | 'energy';

export interface ImportCardSpec {
  name: string;
  kind?: ImportCardKind;
  hp?: number;
  stage?: PokemonStage;
  type?: string;
  quantity?: number;
}

export interface ImportPokemonSpec {
  name: string;
  hp?: number;
  currentHp?: number;
  stage?: PokemonStage;
  type?: string;
  status?: StatusCondition;
  attachedEnergy?: string[];
  damage?: number;
  retreatCost?: number;
  attacks?: Attack[];
  abilities?: Ability[];
}

export interface ImportPlayerState {
  active?: ImportPokemonSpec | null;
  bench?: (ImportPokemonSpec | null)[];
  hand?: (string | ImportCardSpec)[];
  discard?: (string | ImportCardSpec)[];
  prizes?: (string | ImportCardSpec)[] | number;
  deck?: (string | ImportCardSpec)[];
}

export interface ImportGameState {
  turn?: number;
  currentPlayer?: 'player1' | 'player2';
  player1?: ImportPlayerState;
  player2?: ImportPlayerState;
}

export type ImportResult =
  | { ok: true; gameState: GameState; warnings: string[] }
  | { ok: false; errors: string[] };

// ─── Constantes de validación ──────────────────────────────────────────────────

const VALID_STATUS: StatusCondition[] = [
  'none',
  'poisoned',
  'poisoned1',
  'poisoned2',
  'poisoned3',
  'paralyzed',
  'asleep',
  'confused',
];

const VALID_STAGES: PokemonStage[] = ['basic', 'stage1', 'stage2'];

const MAX_BENCH = 5;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Infiere el `kind` de una carta por pistas en el nombre. Heurística mínima:
 * solo reconoce energías por tipo. Todo lo demás cae en `trainer` por defecto,
 * que es la limitación documentada del primer slice (la resolución correcta
 * contra la API/deck preset es una capa posterior).
 */
function inferKind(name: string): ImportCardKind {
  const lower = name.toLowerCase();
  const energyTokens = ['fire', 'water', 'grass', 'lightning', 'electric', 'psychic', 'fighting', 'darkness', 'metal', 'dragon', 'fairy', 'energy'];
  if (energyTokens.some((t) => lower.includes(t))) return 'energy';
  return 'trainer';
}

function normalizeStatus(status: unknown): StatusCondition {
  return typeof status === 'string' && VALID_STATUS.includes(status as StatusCondition)
    ? (status as StatusCondition)
    : 'none';
}

function normalizeStage(stage: unknown): PokemonStage {
  return typeof stage === 'string' && VALID_STAGES.includes(stage as PokemonStage)
    ? (stage as PokemonStage)
    : 'basic';
}

// ─── Construcción de cartas ────────────────────────────────────────────────────

function buildPokemonCard(spec: ImportPokemonSpec): PokemonCard {
  return {
    name: spec.name,
    stage: normalizeStage(spec.stage),
    hp: typeof spec.hp === 'number' && spec.hp > 0 ? spec.hp : 100,
    type: typeof spec.type === 'string' ? spec.type : 'psychic',
    attacks: Array.isArray(spec.attacks) ? spec.attacks : [],
    abilities: Array.isArray(spec.abilities) ? spec.abilities : [],
    retreatCost: typeof spec.retreatCost === 'number' && spec.retreatCost >= 0 ? spec.retreatCost : 1,
    rarity: 'common',
  };
}

function buildPokemonInstance(spec: ImportPokemonSpec, isActive: boolean): PokemonInstance {
  const card = buildPokemonCard(spec);
  const rawCurrentHp = typeof spec.currentHp === 'number' ? spec.currentHp : card.hp;
  return {
    id: uuidv4(),
    card,
    currentHp: clamp(rawCurrentHp, 0, card.hp),
    attachedEnergy: Array.isArray(spec.attachedEnergy) ? spec.attachedEnergy : [],
    status: normalizeStatus(spec.status),
    damage: typeof spec.damage === 'number' ? spec.damage : 0,
    isActive,
  };
}

function toCardSpec(value: string | ImportCardSpec): ImportCardSpec {
  if (typeof value === 'string') return { name: value };
  return value;
}

function buildZoneCard(spec: ImportCardSpec): PokemonCard | TrainerCard | EnergyCard {
  const kind = spec.kind ?? inferKind(spec.name);

  if (kind === 'pokemon') {
    return {
      name: spec.name,
      stage: normalizeStage(spec.stage),
      hp: typeof spec.hp === 'number' && spec.hp > 0 ? spec.hp : 100,
      type: typeof spec.type === 'string' ? spec.type : 'psychic',
      attacks: [],
      retreatCost: 1,
      rarity: 'common',
    };
  }

  if (kind === 'energy') {
    return {
      id: uuidv4(),
      name: spec.name,
      type: (typeof spec.type === 'string' ? spec.type : 'normal') as EnergyType,
      quantity: typeof spec.quantity === 'number' && spec.quantity > 0 ? spec.quantity : 1,
    };
  }

  return {
    id: uuidv4(),
    name: spec.name,
    type: 'item',
    description: '',
    rarity: 'common',
  };
}

// ─── Construcción de un jugador ────────────────────────────────────────────────

function buildPlayerState(input: unknown): PlayerState {
  const src = (input && typeof input === 'object' ? input : {}) as ImportPlayerState;

  const active =
    src.active && typeof src.active === 'object' && typeof src.active.name === 'string'
      ? buildPokemonInstance(src.active, true)
      : null;

  const bench: (PokemonInstance | null)[] = [];
  if (Array.isArray(src.bench)) {
    for (const slot of src.bench.slice(0, MAX_BENCH)) {
      if (slot && typeof slot === 'object' && typeof slot.name === 'string') {
        bench.push(buildPokemonInstance(slot, false));
      } else {
        bench.push(null);
      }
    }
  }

  const toCards = (arr: unknown): (PokemonCard | TrainerCard | EnergyCard)[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => buildZoneCard(toCardSpec(item)));
  };

  const hand = toCards(src.hand);
  const discardPile = toCards(src.discard);
  const deck = toCards(src.deck);

  let prizes: (PokemonCard | TrainerCard | EnergyCard)[];
  if (typeof src.prizes === 'number') {
    const count = clamp(Math.floor(src.prizes), 0, 6);
    prizes = Array.from({ length: count }, () => ({
      id: uuidv4(),
      name: 'Prize Card',
      type: 'item',
      description: '',
      rarity: 'common',
    } as TrainerCard));
  } else {
    prizes = toCards(src.prizes);
  }

  return { deck, hand, discardPile, prizes, active, bench };
}

// ─── Función principal ─────────────────────────────────────────────────────────

export function importStateFromJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['JSON inválido: no se pudo parsear el texto.'] };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['El JSON debe ser un objeto, no un valor escalar ni un array.'] };
  }

  const src = parsed as ImportGameState;

  // currentPlayer: enum estricto
  if (
    src.currentPlayer !== undefined &&
    src.currentPlayer !== 'player1' &&
    src.currentPlayer !== 'player2'
  ) {
    return { ok: false, errors: [`currentPlayer inválido: "${String(src.currentPlayer)}". Debe ser "player1" o "player2".`] };
  }

  // player1 / player2: objeto (o ausente)
  for (const key of ['player1', 'player2'] as const) {
    const value = (src as Record<string, unknown>)[key];
    if (value !== undefined && (value === null || typeof value !== 'object' || Array.isArray(value))) {
      return { ok: false, errors: [`${key} debe ser un objeto.`] };
    }
  }

  const player1 = buildPlayerState(src.player1);
  const player2 = buildPlayerState(src.player2);

  const gameState: GameState = {
    player1,
    player2,
    currentPlayer: src.currentPlayer ?? 'player1',
    turn: typeof src.turn === 'number' && src.turn > 0 ? Math.floor(src.turn) : 1,
    phase: 'turn',
    logs: [],
    mulligan: { player1: false, player2: false },
  };

  return { ok: true, gameState, warnings: [] };
}
