export type CardRarity = 'common' | 'uncommon' | 'rare' | 'ultra' | 'promo';

export type EnergyType = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'fighting' | 'darkness' | 'metal' | 'dragon' | 'fairy' | 'normal' | 'special';

export type PokemonStage = 'basic' | 'stage1' | 'stage2';

export type StatusCondition = 'poisoned' | 'poisoned1' | 'poisoned2' | 'poisoned3' | 'paralyzed' | 'asleep' | 'confused' | 'none';

export interface EnergyCard {
  id: string;
  name: string;
  type: EnergyType;
  quantity: number;
}

export interface PokemonCard {
  id: string;
  name: string;
  stage: PokemonStage;
  hp: number;
  type: string;
  evolvesFrom?: string;
  evolvesTo?: string;
  attacks: Attack[];
  weakness?: { type: string; value: string };
  resistance?: { type: string; value: string };
  retreatCost: number;
  rarity: CardRarity;
  imageUrl?: string;
}

export interface Attack {
  name: string;
  cost: EnergyType[];
  damage: string;
  description: string;
}

export interface TrainerCard {
  id: string;
  name: string;
  type: 'item' | 'stadium' | 'supporter';
  description: string;
  rarity: CardRarity;
}

export interface PokemonInstance {
  id: string;
  card: PokemonCard;
  currentHp: number;
  attachedEnergy: EnergyType[];
  status: StatusCondition;
  damage: number;
  isActive: boolean;
  benchPosition?: number;
}

export interface PlayerState {
  deck: (PokemonCard | TrainerCard | EnergyCard)[];
  hand: (PokemonCard | TrainerCard | EnergyCard)[];
  discardPile: (PokemonCard | TrainerCard | EnergyCard)[];
  prizes: (PokemonCard | TrainerCard | EnergyCard)[];
  active: PokemonInstance | null;
  bench: (PokemonInstance | null)[];
}

export interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  currentPlayer: 'player1' | 'player2';
  turn: number;
  phase: 'setup' | 'draw' | 'turn' | 'end';
  logs: string[];
  mulligan: {
    player1: boolean;
    player2: boolean;
  };
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  gameState: GameState;
}

export interface DeckPreset {
  id?: string;
  name: string;
  description: string;
  pokemon: Omit<PokemonCard, 'id'>[];
  trainers: Omit<TrainerCard, 'id'>[];
  energies: { type: EnergyType; quantity: number }[];
}

export interface MoveRecommendation {
  id: string;
  move: string;
  reason: string;
  ev: number;
}