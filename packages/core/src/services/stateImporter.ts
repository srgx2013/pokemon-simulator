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
  DeckPreset,
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
  evolvedThisTurn?: boolean;
}

export interface ImportPlayerState {
  active?: ImportPokemonSpec | null;
  bench?: (ImportPokemonSpec | null)[];
  hand?: (string | ImportCardSpec)[] | number;
  discard?: (string | ImportCardSpec)[];
  prizes?: (string | ImportCardSpec)[] | number;
  deck?: (string | ImportCardSpec)[] | number;
  turnActions?: {
    supporterUsed?: boolean;
    energyAttached?: boolean;
    retreated?: boolean;
    attacked?: boolean;
  };
  turnLog?: string[];
}

export interface ImportGameState {
  turn?: number;
  currentPlayer?: 'player1' | 'player2';
  player1?: ImportPlayerState;
  player2?: ImportPlayerState;
}

export interface ImportDecks {
  player1?: DeckPreset | null;
  player2?: DeckPreset | null;
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

const ENERGY_NAME_MAP: Record<string, EnergyType> = {
  fire: 'fire', fuego: 'fire',
  water: 'water', agua: 'water',
  grass: 'grass', planta: 'grass',
  electric: 'electric', lightning: 'electric', rayo: 'electric',
  psychic: 'psychic', psíquica: 'psychic', psiquica: 'psychic',
  fighting: 'fighting', lucha: 'fighting',
  darkness: 'darkness', oscuridad: 'darkness',
  metal: 'metal',
  dragon: 'dragon', dragón: 'dragon',
  fairy: 'fairy', hada: 'fairy',
  normal: 'normal', incolora: 'normal', incoloro: 'normal',
};

function inferEnergyType(name: string): EnergyType | null {
  const lower = name.toLowerCase();
  for (const [token, type] of Object.entries(ENERGY_NAME_MAP)) {
    if (lower.includes(token)) return type;
  }
  return null;
}

/**
 * Infiere el `kind` de una carta por pistas en el nombre (energías por tipo,
 * en inglés o español). Todo lo demás cae en `trainer` por defecto, que es la
 * limitación documentada (la resolución correcta contra la API/deck preset
 * es una capa posterior).
 */
function inferKind(name: string): ImportCardKind {
  return inferEnergyType(name) !== null ? 'energy' : 'trainer';
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildCardLookup(deck: DeckPreset | null): Map<string, PokemonCard | TrainerCard | EnergyCard> {
  const map = new Map<string, PokemonCard | TrainerCard | EnergyCard>();
  if (!deck) return map;
  for (const p of deck.pokemon) {
    if (!map.has(p.name)) map.set(p.name, { ...p, id: uuidv4() });
  }
  for (const t of deck.trainers) {
    if (!map.has(t.name)) map.set(t.name, { ...t, id: uuidv4() });
  }
  for (const e of deck.energies) {
    const name = e.name || `${capitalize(e.type)} Energy`;
    if (!map.has(name)) map.set(name, { id: uuidv4(), name, type: e.type, quantity: e.quantity });
  }
  return map;
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

function buildPokemonInstance(
  spec: ImportPokemonSpec,
  isActive: boolean,
  lookup?: Map<string, PokemonCard | TrainerCard | EnergyCard>,
): PokemonInstance {
  const resolved = lookup?.get(spec.name);
  const card = resolved && 'stage' in resolved
    ? (resolved as PokemonCard)
    : buildPokemonCard(spec);
  const rawCurrentHp = typeof spec.currentHp === 'number' ? spec.currentHp : card.hp;
  return {
    id: uuidv4(),
    card,
    currentHp: clamp(rawCurrentHp, 0, card.hp),
    attachedEnergy: Array.isArray(spec.attachedEnergy) ? spec.attachedEnergy : [],
    status: normalizeStatus(spec.status),
    damage: typeof spec.damage === 'number' ? spec.damage : 0,
    isActive,
    evolvedThisTurn: spec.evolvedThisTurn === true,
  };
}

function toCardSpec(value: string | ImportCardSpec): ImportCardSpec {
  if (typeof value === 'string') return { name: value };
  return value;
}

function buildZoneCard(
  spec: ImportCardSpec,
  lookup?: Map<string, PokemonCard | TrainerCard | EnergyCard>,
): PokemonCard | TrainerCard | EnergyCard {
  const resolved = lookup?.get(spec.name);
  if (resolved) return { ...resolved, id: uuidv4() };

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
    const energyType =
      typeof spec.type === 'string'
        ? (spec.type as EnergyType)
        : (inferEnergyType(spec.name) ?? 'normal');
    return {
      id: uuidv4(),
      name: spec.name,
      type: energyType,
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

function buildPlayerState(input: unknown, deckPreset: DeckPreset | null): PlayerState {
  const src = (input && typeof input === 'object' ? input : {}) as ImportPlayerState;
  const lookup = buildCardLookup(deckPreset);

  const active =
    src.active && typeof src.active === 'object' && typeof src.active.name === 'string'
      ? buildPokemonInstance(src.active, true, lookup)
      : null;

  const bench: (PokemonInstance | null)[] = [];
  if (Array.isArray(src.bench)) {
    for (const slot of src.bench.slice(0, MAX_BENCH)) {
      if (slot && typeof slot === 'object' && typeof slot.name === 'string') {
        bench.push(buildPokemonInstance(slot, false, lookup));
      } else {
        bench.push(null);
      }
    }
  }

  const toCards = (arr: unknown): (PokemonCard | TrainerCard | EnergyCard)[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => buildZoneCard(toCardSpec(item), lookup));
  };

  const makePlaceholders = (count: number, label: string): TrainerCard[] =>
    Array.from({ length: count }, () => ({
      id: uuidv4(),
      name: label,
      type: 'item',
      description: '',
      rarity: 'common',
    } as TrainerCard));

  const hand = typeof src.hand === 'number'
    ? makePlaceholders(clamp(Math.floor(src.hand), 0, 100), 'Hidden Card')
    : toCards(src.hand);
  const discardPile = toCards(src.discard);
  const deck = typeof src.deck === 'number'
    ? makePlaceholders(clamp(Math.floor(src.deck), 0, 100), 'Unknown Card')
    : toCards(src.deck);

  let prizes: (PokemonCard | TrainerCard | EnergyCard)[];
  if (typeof src.prizes === 'number') {
    const count = clamp(Math.floor(src.prizes), 0, 6);
    prizes = makePlaceholders(count, 'Prize Card');
  } else {
    prizes = toCards(src.prizes);
  }

  const turnActions = src.turnActions ? {
    supporterUsed: src.turnActions.supporterUsed === true,
    energyAttached: src.turnActions.energyAttached === true,
    retreated: src.turnActions.retreated === true,
    attacked: src.turnActions.attacked === true,
  } : undefined;

  const turnLog = Array.isArray(src.turnLog)
    ? src.turnLog.filter((x): x is string => typeof x === 'string')
    : undefined;

  return { deck, hand, discardPile, prizes, active, bench, turnActions, turnLog };
}

// ─── Función principal ─────────────────────────────────────────────────────────

export function importStateFromJson(text: string, decks?: ImportDecks): ImportResult {
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

  const player1 = buildPlayerState(src.player1, decks?.player1 ?? null);
  const player2 = buildPlayerState(src.player2, decks?.player2 ?? null);

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
