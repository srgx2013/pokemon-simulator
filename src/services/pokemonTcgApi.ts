// Pokémon TCG API Integration
// Docs: https://docs.pokemontcg.io/

const API_BASE = 'https://api.pokemontcg.io/v2';
const CACHE_KEY = 'pokemon_tcg_cache';

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
    
    if (setCode) {
      const apiSetCode = setCodeMap[setCode.toUpperCase()];
      if (apiSetCode) {
        query += ` set.id:${apiSetCode}`;
        if (number) query += ` number:${number}`;
      } else if (number) {
        // Set code desconocido — buscar solo por nombre + numero
        query += ` number:${number}`;
      }
      // Si no conocemos el set y no hay numero, buscar solo por nombre
    } else if (number) {
      query += ` number:${number}`;
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

// ════════════════════════════════════════════════════════════════
// TCGdex API — respaldo cuando la Pokémon TCG API no encuentra una carta
// Docs: https://tcgdex.dev/rest
// ════════════════════════════════════════════════════════════════

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en';
const TCGDEX_CACHE_KEY = 'tcgdex_cache';

interface TcgdexCacheData {
  cards: any[];
  timestamp: number;
}

function getTcgdexCache(): Record<string, TcgdexCacheData> {
  try {
    const cached = localStorage.getItem(TCGDEX_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setTcgdexCache(key: string, cards: any[]): void {
  try {
    const cache = getTcgdexCache();
    cache[key] = { cards, timestamp: Date.now() };
    localStorage.setItem(TCGDEX_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache TCGdex:', e);
  }
}

/**
 * Busca una carta en TCGdex por nombre exacto.
 * Se usa como respaldo cuando la Pokémon TCG API no encuentra la carta.
 * Retorna null si no se encuentra.
 */
export async function fetchCardFromTcgdex(name: string): Promise<any | null> {
  const cacheKey = 'name_' + name.toLowerCase();
  const cache = getTcgdexCache();

  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return cache[cacheKey].cards[0] || null;
  }

  try {
    // Paso 1: buscar por nombre exacto para obtener el ID
    const searchUrl = TCGDEX_BASE + '/cards?name=eq:' + encodeURIComponent(name);
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!Array.isArray(searchData) || searchData.length === 0) return null;

    const cardId = searchData[0].id;
    if (!cardId) return null;

    // Paso 2: obtener datos completos por ID
    const cardUrl = TCGDEX_BASE + '/cards/' + cardId;
    const cardRes = await fetch(cardUrl);
    if (!cardRes.ok) return null;

    const cardData = await cardRes.json();

    // Cachear
    setTcgdexCache(cacheKey, [cardData]);

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
      cost: a.cost || [],
      convertedEnergyCost: (a.cost || []).length,
      damage: a.damage ? String(a.damage) : '0',
      text: a.effect || '',
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
    hp: parseInt(apiCard.hp || '100') || 100,
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
export function convertApiEnergy(apiCard: CardData): { type: string; quantity: number } | null {
  // El tipo de energía se obtiene del nombre o de types
  const nameLower = apiCard.name.toLowerCase();
  const energyTypes: Record<string, string> = {
    fire: 'fire', water: 'water', grass: 'grass',
    electric: 'electric', psychic: 'psychic', fighting: 'fighting',
    darkness: 'darkness', metal: 'metal', dragon: 'dragon',
    fairy: 'fairy', normal: 'normal', special: 'special',
  };

  // Buscar el tipo en el nombre primero, ej: "Fire Energy" -> "fire"
  for (const [key, val] of Object.entries(energyTypes)) {
    if (nameLower.includes(key)) {
      return { type: val, quantity: 1 };
    }
  }

  // Fallback: si tiene types, usar el primero
  if (apiCard.types && apiCard.types.length > 0) {
    const t = apiCard.types[0].toLowerCase();
    if (energyTypes[t]) {
      return { type: t, quantity: 1 };
    }
  }

  // Si tiene "special" en subtypes, es energía especial
  if (apiCard.subtypes?.includes('Special')) {
    return { type: 'special', quantity: 1 };
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
