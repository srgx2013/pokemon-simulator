// Pokémon TCG API Integration
// Docs: https://docs.pokemontcg.io/

import type { EnergyType } from '../types';
import type { StorageAdapter } from '../storage/types';
import { STORAGE_KEYS } from '../storage/types';

const API_BASE = 'https://api.pokemontcg.io/v2';
const FETCH_TIMEOUT_MS = 8000;

// Mapeo de códigos de set comunes -> API set IDs
// Basado en https://api.pokemontcg.io/v2/sets
export const setCodeMap: Record<string, string> = {
  // --- Scarlet & Violet ---
  'SVI': 'sv1',     // Scarlet & Violet
  'PAL': 'sv2',     // Paldea Evolved
  'OBF': 'sv3',     // Obsidian Flames
  'MEW': 'sv3pt5',  // 151
  'PAR': 'sv4',     // Paradox Rift
  'PAF': 'sv4pt5',  // Paldean Fates
  'TEF': 'sv5',     // Temporal Forces
  'TWM': 'sv6',     // Twilight Masquerade
  'SFA': 'sv6pt5',  // Shrouded Fable
  'SCR': 'sv7',     // Stellar Crown
  'SSP': 'sv8',     // Surging Sparks
  'PRE': 'sv8pt5',  // Prismatic Evolutions
  'JTG': 'sv9',     // Journey Together
  'DRI': 'sv10',    // Destined Rivals
  // --- Scarlet & Violet Black Star Promos ---
  'SVP': 'svp',
  // --- Mega Evolution ---
  'MEG': 'me1',     // Mega Evolution
  'PHA': 'me2',     // Phantasmal Flames
  'ASC': 'me2pt5',  // Ascended Heroes
  'PER': 'me3',     // Perfect Order
  'CHA': 'me4',     // Chaos Rising
  'PBL': 'me5',     // Pitch Black
  'POR': 'me3',     // Perfect Order (Meowth ex, Poké Pad)
  'CRI': 'me4',     // Chaos Rising (Patrat, Prism Tower)
  // --- Crown Zenith ---
  'CRZ': 'swsh12pt5',   // Crown Zenith
  'CRZGG': 'swsh12pt5gg', // Crown Zenith Galarian Gallery
  // --- Sword & Shield ---
  'SWSH': 'swsh1',  // Sword & Shield
  'RCL': 'swsh2',   // Rebel Clash
  'DAA': 'swsh3',   // Darkness Ablaze
  'VIV': 'swsh4',   // Vivid Voltage
  'BST': 'swsh5',   // Battle Styles
  'CRE': 'swsh6',   // Chilling Reign
  'EVS': 'swsh7',   // Evolving Skies
  'FST': 'swsh8',   // Fusion Strike
  'BRS': 'swsh9',   // Brilliant Stars
  'ASR': 'swsh10',  // Astral Radiance
  'LOR': 'swsh11',  // Lost Origin
  'SIT': 'swsh12',  // Silver Tempest
  // --- Sword & Shield Promos ---
  'PR-SW': 'swshp',
  // --- Special sets ---
  'CEL': 'cel25',   // Celebrations
  'PGO': 'pgo',     // Pokemon GO
  // --- Scarlet & Violet Energies ---
  'SVE': 'sve',
};

// Cache local — reads/writes flow through the injected StorageAdapter
// (spec C-1: every key, including both API caches, goes through the adapter).
interface CacheData {
  cards: CardData[];
  timestamp: number;
}

export async function getCache(adapter: StorageAdapter): Promise<Record<string, CacheData>> {
  try {
    const cached = await adapter.getItem(STORAGE_KEYS.tcgCache);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

export async function setCache(adapter: StorageAdapter, key: string, cards: CardData[]): Promise<void> {
  try {
    const cache = await getCache(adapter);
    cache[key] = { cards, timestamp: Date.now() };
    await adapter.setItem(STORAGE_KEYS.tcgCache, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache:', e);
  }
}

// Buscar carta por nombre y set con reintentos automáticos
export async function fetchCard(adapter: StorageAdapter, name: string, setCode?: string, number?: string): Promise<CardData | null> {
      const normNumber = normalizeCardNumber(number);
  const cacheKey = `${name.toLowerCase()}_${setCode || ''}_${normNumber || ''}`;
  const cache = await getCache(adapter);
  
  // Verificar cache (válido por 24 horas)
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return cache[cacheKey].cards[0] || null;
  }

  // Reintentos con backoff exponencial para rate limiting
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let query = `name:"${encodeURIComponent(name)}"`;
      
      if (setCode) {
        const apiSetCode = setCodeMap[setCode.toUpperCase()];
        if (apiSetCode) {
          query += ` set.id:${apiSetCode}`;
          if (normNumber) query += ` number:${normNumber}`;
        } else if (normNumber) {
          query += ` number:${number}`;
        }
      } else if (normNumber) {
        query += ` number:${number}`;
      }
      
      const response = await fetch(`${API_BASE}/cards?q=${query}`, { signal: (AbortSignal as any).timeout(FETCH_TIMEOUT_MS) });
      
      if (!response.ok) {
        // 429 = rate limited, 404 = podría ser rate limit encubierto
        if ((response.status === 429 || response.status === 404) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1500; // 1.5s, 3s, 6s
          console.warn(`Rate limited (${response.status}), retry ${attempt + 1}/${maxRetries} in ${delay}ms: ${name}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const cards: CardData[] = data.data || [];
      
      let result = cards;
      if (normNumber) {
        result = cards.filter(c => c.number === normNumber);
      }
      
      if (result.length > 0) {
        await setCache(adapter, cacheKey, result);
      }
      
      return result[0] || null;
    } catch (error) {
      // Solo reintentar en errores recuperables (rate limit, conexión)
      const isRetryable = error instanceof TypeError || 
        (error instanceof Error && (error.message.includes('429') || error.message.includes('Failed to fetch'))) ||
        (typeof error === 'object' && error !== null && ((error as any).name === 'AbortError' || (error as any).name === 'TimeoutError'));
      
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1500;
        console.warn(`Retryable error, attempt ${attempt + 1}/${maxRetries} in ${delay}ms: ${name}`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        if (attempt >= maxRetries) {
          console.error('Failed to fetch card after retries:', error);
        }
        return null;
      }
    }
  }
  return null;
}

// Buscar cartas de un deck completo
export async function fetchDeckCards(adapter: StorageAdapter, cards: { name: string; set?: string; number?: string }[]): Promise<Map<string, CardData>> {
  const results = new Map<string, CardData>();
  
  for (const card of cards) {
    const key = `${card.name}_${card.set || ''}_${card.number || ''}`;
    
    if (!results.has(key)) {
      const data = await fetchCard(adapter, card.name, card.set, card.number);
      if (data) {
        results.set(key, data);
      }
      // Rate limit: esperar 100ms entre requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// ════════════════════════════════════════════════════════════════
// TCGdex API — respaldo cuando la Pokémon TCG API no encuentra una carta
// Docs: https://tcgdex.dev/rest
// ════════════════════════════════════════════════════════════════

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en';

interface TcgdexCacheData {
  cards: any[];
  timestamp: number;
}

async function getTcgdexCache(adapter: StorageAdapter): Promise<Record<string, TcgdexCacheData>> {
  try {
    const cached = await adapter.getItem(STORAGE_KEYS.tcgdexCache);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

async function setTcgdexCache(adapter: StorageAdapter, key: string, cards: any[]): Promise<void> {
  try {
    const cache = await getTcgdexCache(adapter);
    cache[key] = { cards, timestamp: Date.now() };
    await adapter.setItem(STORAGE_KEYS.tcgdexCache, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache TCGdex:', e);
  }
}

/**
 * Busca una carta en TCGdex por nombre exacto.
 * Se usa como respaldo cuando la Pokémon TCG API no encuentra la carta.
 * Retorna null si no se encuentra.
 */
export async function fetchCardFromTcgdex(adapter: StorageAdapter, name: string): Promise<any | null> {
  const cacheKey = 'name_' + name.toLowerCase();
  const cache = await getTcgdexCache(adapter);

  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return cache[cacheKey].cards[0] || null;
  }

  try {
    // Paso 1: buscar por nombre exacto para obtener el ID
    const searchUrl = TCGDEX_BASE + '/cards?name=eq:' + encodeURIComponent(name);
    const searchRes = await fetch(searchUrl, { signal: (AbortSignal as any).timeout(FETCH_TIMEOUT_MS) });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!Array.isArray(searchData) || searchData.length === 0) return null;

    const cardId = searchData[0].id;
    if (!cardId) return null;

    // Paso 2: obtener datos completos por ID
    const cardUrl = TCGDEX_BASE + '/cards/' + cardId;
    const cardRes = await fetch(cardUrl, { signal: (AbortSignal as any).timeout(FETCH_TIMEOUT_MS) });
    if (!cardRes.ok) return null;

    const cardData = await cardRes.json();

    // Cachear
    await setTcgdexCache(adapter, cacheKey, [cardData]);

    return cardData;
  } catch (error) {
    console.warn('Failed to fetch from TCGdex:', error);
    return null;
  }
}

/**
 * Convierte una respuesta de TCGdex al formato interno CardData
 * para que sea compatible con convertApiCard / convertApiTrainer / convertApiEnergy
 */
export function convertTcgdexToCardData(tcgCard: any): CardData | null {
  if (!tcgCard || !tcgCard.category) return null;

  const base: CardData = {
    id: tcgCard.id || '',
    name: tcgCard.name || '',
    supertype: tcgCard.category === 'Pokemon' ? 'Pokémon' : tcgCard.category === 'Trainer' ? 'Trainer' : 'Energy',
    subtypes: [],
    hp: tcgCard.hp ? String(tcgCard.hp) : undefined,
    types: tcgCard.types || [],
    evolvesFrom: tcgCard.evolveFrom,
    rarity: tcgCard.rarity,
    set: tcgCard.set ? { id: tcgCard.set.id || '', name: tcgCard.set.name || '' } : { id: '', name: '' },
    number: String(tcgCard.localId ?? ''),
    images: { small: '', large: tcgCard.image || '' },
  };

  // Mapear stage para Pokémon
  if (tcgCard.stage) {
    const stageMap: Record<string, string> = {
      'Basic': 'Basic',
      'Stage1': 'Stage 1',
      'Stage2': 'Stage 2',
    };
    if (stageMap[tcgCard.stage]) {
      base.subtypes!.push(stageMap[tcgCard.stage]);
    }
  }

  // Mapear trainerType para Trainers
  if (tcgCard.trainerType) {
    base.subtypes!.push(tcgCard.trainerType);
  }

  // Mapear attacks
  if (tcgCard.attacks && Array.isArray(tcgCard.attacks)) {
    base.attacks = tcgCard.attacks.map((a: any) => ({
      name: a.name || '',
      cost: normalizeEnergyCost(a.cost),
      convertedEnergyCost: (a.cost || []).length,
      damage: a.damage ? String(a.damage) : '0',
      text: a.effect || '',
    }));
  }

  // Mapear abilities (TCGdex usa `effect`, no `text`)
  if (tcgCard.abilities && Array.isArray(tcgCard.abilities)) {
    base.abilities = tcgCard.abilities.map((a: any) => ({
      name: a.name || '',
      text: a.effect || a.text || '',
      type: a.type || 'Ability',
    }));
  }

  // Mapear weaknesses
  if (tcgCard.weaknesses && Array.isArray(tcgCard.weaknesses)) {
    base.weaknesses = tcgCard.weaknesses.map((w: any) => ({
      type: w.type || '',
      value: w.value || '',
    }));
  }

  // Mapear retreat cost
  if (tcgCard.retreat !== undefined) {
    base.retreatCost = Array(tcgCard.retreat).fill('Colorless');
  }

  // Mapear reglas de Trainer
  if (tcgCard.effect) {
    base.rules = [tcgCard.effect];
  }

  return base;
}

// Tipos para la respuesta de la API
export interface CardData {
  id: string;
  name: string;
  supertype: string;       // "Pokémon" | "Trainer" | "Energy"
  hp?: string;
  types?: string[];
  subtypes?: string[];
  evolvesFrom?: string;
  attacks?: AttackData[];
  abilities?: AbilityData[];
  rules?: string[];        // texto de efecto para Trainer
  weaknesses?: WeaknessData[];
  resistances?: ResistanceData[];
  retreatCost?: string[];
  rarity?: string;
  set: {
    id: string;
    name: string;
  };
  number: string;
  images: {
    small: string;
    large: string;
  };
}

export interface AttackData {
  name: string;
  cost: string[];
  convertedEnergyCost: number;
  damage: string;
  text: string;
}

export interface AbilityData {
  name: string;
  text: string;
  type: string;
}

export interface WeaknessData {
  type: string;
  value: string;
}

export interface ResistanceData {
  type: string;
  value: string;
}

// Normaliza el costo de ataque de fuentes externas (Pokémon TCG API / TCGdex)
// al EnergyType interno: 'Grass' -> 'grass', 'Colorless' -> 'normal', 'Lightning' -> 'electric', etc.
export function normalizeEnergyCost(cost?: string[]): EnergyType[] {
  const map: Record<string, EnergyType> = {
    Grass: 'grass',
    Fire: 'fire',
    Water: 'water',
    Lightning: 'electric',
    Psychic: 'psychic',
    Fighting: 'fighting',
    Darkness: 'darkness',
    Metal: 'metal',
    Dragon: 'dragon',
    Fairy: 'fairy',
    Colorless: 'normal',
  };
  return (cost || []).map((c) => map[c] ?? (c.toLowerCase() as EnergyType));
}

// Normaliza el numero de carta para matching de claves:
// quita ceros iniciales en numeros puramente numericos ("039" -> "39")
// pero deja intactos codigos no numericos ("TG05", "HR", "SM53").
export function normalizeCardNumber(num?: string) {
  if (!num) return num;
  return /^\d+$/.test(num) ? String(parseInt(num, 10)) : num;
}

// Convertir formato API a formato interno
export function convertApiCard(apiCard: CardData): any {
  const stage = apiCard.subtypes?.includes('Stage 2') ? 'stage2' 
    : apiCard.subtypes?.includes('Stage 1') ? 'stage1' 
    : 'basic';
  
  const attacks = (apiCard.attacks || []).map(a => ({
    name: a.name,
    cost: normalizeEnergyCost(a.cost),
    damage: a.damage,
    description: a.text,
  }));

  const abilities = (apiCard.abilities || []).map(a => ({
    name: a.name,
    text: a.text,
    type: a.type,
  }));

  return {
    name: apiCard.name,
    stage,
    hp: parseInt(apiCard.hp || '100') || 100,
    type: (apiCard.types || ['normal'])[0].toLowerCase(),
    evolvesFrom: apiCard.evolvesFrom,
    attacks,
    abilities,
    weakness: apiCard.weaknesses?.[0] ? {
      type: apiCard.weaknesses[0].type.toLowerCase(),
      value: apiCard.weaknesses[0].value,
    } : undefined,
    resistance: apiCard.resistances?.[0] ? {
      type: apiCard.resistances[0].type.toLowerCase(),
      value: apiCard.resistances[0].value,
    } : undefined,
    retreatCost: apiCard.retreatCost?.length || 0,
    rarity: mapRarity(apiCard.rarity),
    imageUrl: apiCard.images?.large,
  };
}

/**
 * Convierte una carta de tipo Trainer desde la API al formato interno.
 * Usa subtypes para determinar si es Supporter, Stadium o Item.
 */
export function convertApiTrainer(apiCard: CardData): { name: string; type: 'supporter' | 'item' | 'stadium'; description: string; rarity: 'common' | 'uncommon' | 'rare' | 'ultra' | 'promo' } {
  const subtypes = apiCard.subtypes || [];
  let type: 'supporter' | 'item' | 'stadium';
  if (subtypes.includes('Supporter')) {
    type = 'supporter';
  } else if (subtypes.includes('Stadium')) {
    type = 'stadium';
  } else {
    type = 'item';
  }

  // El texto del efecto puede venir en rules o abilities
  const description = apiCard.rules?.join(' ') || '';

  return {
    name: apiCard.name,
    type,
    description,
    rarity: mapRarity(apiCard.rarity),
  };
}

/**
 * Convierte una carta de tipo Energía desde la API al formato interno.
 * Devuelve { type, quantity } para uso en DeckPreset.energies.
 */
export function convertApiEnergy(apiCard: CardData): { name: string; type: string; quantity: number } | null {
  // 1. Si la API dice que es Special, es Special (sin importar el nombre)
  if (apiCard.subtypes?.includes('Special')) {
    return { name: apiCard.name, type: 'special', quantity: 1 };
  }

  // 2. Buscar el tipo en el nombre, ej: "Fire Energy" -> "fire"
  const nameLower = apiCard.name.toLowerCase();
  const energyTypes: Record<string, string> = {
    fire: 'fire', water: 'water', grass: 'grass',
    electric: 'electric', psychic: 'psychic', fighting: 'fighting',
    darkness: 'darkness', metal: 'metal', dragon: 'dragon',
    fairy: 'fairy', normal: 'normal',
  };
  for (const [key, val] of Object.entries(energyTypes)) {
    if (nameLower.includes(key)) {
      return { name: apiCard.name, type: val, quantity: 1 };
    }
  }

  // 3. Si tiene types array, usar el primero
  if (apiCard.types && apiCard.types.length > 0) {
    const t = apiCard.types[0].toLowerCase();
    if (energyTypes[t]) {
      return { name: apiCard.name, type: t, quantity: 1 };
    }
  }

  return null;
}

function mapRarity(apiRarity?: string): 'common' | 'uncommon' | 'rare' | 'ultra' | 'promo' {
  if (!apiRarity) return 'common';
  
  const rarity = apiRarity.toLowerCase();
  if (rarity.includes('ultra')) return 'ultra';
  if (rarity.includes('rainbow')) return 'ultra';
  if (rarity.includes('hyper')) return 'ultra';
  if (rarity.includes('rare')) return 'rare';
  if (rarity.includes('uncommon')) return 'uncommon';
  return 'common';
}
