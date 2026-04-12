// Pokémon TCG API Integration
// Docs: https://docs.pokemontcg.io/

const API_BASE = 'https://api.pokemontcg.io/v2';
const CACHE_KEY = 'pokemon_tcg_cache';

// Mapeo de códigos de set comunes (TWM -> sv6)
export const setCodeMap: Record<string, string> = {
  'TWM': 'sv6',    // Twilight Masquerade
  'SFA': 'sv5',    // Stellar Crown
  'SSP': 'sv5',    // Stellar Crown (alternativo)
  'PRE': 'sv4',    // Shrouded Fable
  'SVP': 'sv4',    // Shrouded Fable
  'TWi': 'sv3',    // Journey Together
  'PAB': 'sv3',    // Journey Together
  'SCR': 'sv3',    // Journey Together
  'TEF': 'sv2',    // Destined Rivals
  'CRZ': 'sv2',    // Destined Rivals
  'PAL': 'sv1',     // Prismatic Evolutions
  'PAR': 'sv1',     // Prismatic Evolutions
  'MEW': 'sv1',     // Prismatic Evolutions
  'Oger': 'sv1',    // Prismatic Evolutions
  'ARI': 'sv1',     // Prismatic Evolutions
  'EX': 'ex1',      // Generations
  'PGO': 'pgo',     // Pokémon GO
  'LOR': 'swsh12',  // Lost Origin
  'SWSH': 'swsh12', // Sword & Shield base
  'BRS': 'swsh12',  // Brilliant Stars
  'CRU': 'swsh12',  // Crown Zenith
  'VIV': 'swsh12',  // Silver Tempest
  'CEL': 'swsh12',  // Celebrations
};

// Cache local
interface CacheData {
  cards: CardData[];
  timestamp: number;
}

export function getCache(): Record<string, CacheData> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

export function setCache(key: string, cards: CardData[]): void {
  try {
    const cache = getCache();
    cache[key] = { cards, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache:', e);
  }
}

// Buscar carta por nombre y set
export async function fetchCard(name: string, setCode?: string, number?: string): Promise<CardData | null> {
  const cacheKey = `${name.toLowerCase()}_${setCode || ''}_${number || ''}`;
  const cache = getCache();
  
  // Verificar cache (válido por 24 horas)
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return cache[cacheKey].cards[0] || null;
  }

  try {
    let query = `name:${encodeURIComponent(name)}`;
    
    if (setCode && number) {
      const apiSetCode = setCodeMap[setCode.toUpperCase()] || setCode.toLowerCase();
      query += ` set.id:${apiSetCode}`;
    }
    
    const response = await fetch(`${API_BASE}/cards?q=${query}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const cards: CardData[] = data.data || [];
    
    // Filtrar por número si se especificó
    let result = cards;
    if (number) {
      result = cards.filter(c => c.number === number);
    }
    
    // Guardar en cache
    if (result.length > 0) {
      setCache(cacheKey, result);
    }
    
    return result[0] || null;
  } catch (error) {
    console.error('Failed to fetch card:', error);
    return null;
  }
}

// Buscar cartas de un deck completo
export async function fetchDeckCards(cards: { name: string; set?: string; number?: string }[]): Promise<Map<string, CardData>> {
  const results = new Map<string, CardData>();
  
  for (const card of cards) {
    const key = `${card.name}_${card.set || ''}_${card.number || ''}`;
    
    if (!results.has(key)) {
      const data = await fetchCard(card.name, card.set, card.number);
      if (data) {
        results.set(key, data);
      }
      // Rate limit: esperar 100ms entre requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Tipos para la respuesta de la API
export interface CardData {
  id: string;
  name: string;
  hp: string;
  types: string[];
  subtypes?: string[];
  evolvesFrom?: string;
  attacks?: AttackData[];
  abilities?: AbilityData[];
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

// Convertir formato API a formato interno
export function convertApiCard(apiCard: CardData): any {
  const stage = apiCard.subtypes?.includes('Stage 2') ? 'stage2' 
    : apiCard.subtypes?.includes('Stage 1') ? 'stage1' 
    : 'basic';
  
  const attacks = (apiCard.attacks || []).map(a => ({
    name: a.name,
    cost: a.cost,
    damage: a.damage,
    description: a.text,
  }));
  
  return {
    name: apiCard.name,
    stage,
    hp: parseInt(apiCard.hp) || 100,
    type: (apiCard.types || ['normal'])[0].toLowerCase(),
    evolvesFrom: apiCard.evolvesFrom,
    attacks,
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
