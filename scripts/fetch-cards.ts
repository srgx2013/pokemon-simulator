#!/usr/bin/env node
/**
 * Seed script — populates packages/core/src/data/cards.generated.ts from the Pokémon TCG API.
 *
 * For every set in setCodeMap it fetches all Pokémon and writes them as a
 * Record keyed by `${name}-${setCode}-${number}` (the same key parseDeckListWithApi
 * uses as its primary local cache). Run:
 *
 *   node scripts/fetch-cards.ts        (or: npm run update-cards)
 *
 * The output file is GENERATED — do not edit by hand. Re-run after any new set
 * releases to keep the local card database current.
 */
import { writeFileSync } from 'node:fs';
import { setCodeMap, normalizeEnergyCost, normalizeCardNumber } from '../packages/core/src/services/pokemonTcgApi.ts';

type Stage = 'basic' | 'stage1' | 'stage2';

interface DbCard {
  name: string;
  set: string;
  num: string;
  hp: number;
  type: string;
  stage: Stage;
  rarity: string;
  attacks: { name: string; cost: string[]; damage: string; description: string }[];
  evolvesFrom?: string;
  weakness?: { type: string; value: string };
  retreatCost: number;
}

const API_BASE = 'https://api.pokemontcg.io/v2';
const PAGE_SIZE = 250;
const SET_DELAY_MS = 200;
const PAGE_DELAY_MS = 250;

function mapApiToDb(code: string, c: any): DbCard {
  const subtypes: string[] = c.subtypes || [];
  const stage: Stage = subtypes.includes('Stage 2')
    ? 'stage2'
    : subtypes.includes('Stage 1')
      ? 'stage1'
      : 'basic';

  return {
    name: c.name,
    set: code,
    num: c.number,
    hp: c.hp ? parseInt(c.hp, 10) || 0 : 0,
    type: (c.types?.[0] || 'colorless').toLowerCase(),
    stage,
    rarity: c.rarity || 'Unknown',
    attacks: (c.attacks || []).map((a: any) => ({
      name: a.name,
      cost: normalizeEnergyCost(a.cost),
      damage: a.damage || '',
      description: a.text || '',
    })),
    evolvesFrom: c.evolvesFrom || undefined,
    weakness: c.weaknesses?.[0]
      ? { type: c.weaknesses[0].type.toLowerCase(), value: c.weaknesses[0].value }
      : undefined,
    retreatCost: c.retreatCost?.length || 0,
  };
}

async function fetchSet(apiSet: string): Promise<any[]> {
  const cards: any[] = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE}/cards?q=set.id:${apiSet}&pageSize=${PAGE_SIZE}&page=${page}`;
    let res: Response | null = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        res = await fetch(url);
        if (res.ok) break;
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }

    if (!res || !res.ok) {
      throw new Error(`API ${res?.status ?? 'network'} for set ${apiSet} page ${page}`);
    }

    const data = await res.json();
    const pageCards: any[] = data.data || [];
    cards.push(...pageCards);

    const total: number = data.total || 0;
    if (cards.length >= total || pageCards.length < PAGE_SIZE) break;
    page++;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  return cards;
}

async function fetchSetWithRetry(code: string, apiSet: string, attempts = 3): Promise<any[]> {
  let lastErr = '';
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchSet(apiSet);
    } catch (e) {
      lastErr = (e as Error).message;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error(`${lastErr} (set ${code}/${apiSet})`);
}

async function main(): Promise<void> {
  const db: Record<string, DbCard> = {};
  const sets = Object.entries(setCodeMap);
  let count = 0;

  const failed: [string, string][] = [];

  for (const [code, apiSet] of sets) {
    try {
      const cards = await fetchSet(apiSet);
      for (const c of cards) {
        if (c.supertype !== 'Pokémon') continue; // cardDatabase stores Pokémon only
        const key = `${c.name}-${code}-${normalizeCardNumber(c.number)}`;
        db[key] = mapApiToDb(code, c);
        count++;
      }
      console.log(`✓ ${code} (${apiSet}): ${cards.length} cards`);
    } catch (e) {
      console.error(`✗ ${code} (${apiSet}) failed:`, (e as Error).message);
      failed.push([code, apiSet]);
    }
    await new Promise((r) => setTimeout(r, SET_DELAY_MS));
  }

  // Pasada de reintento para los sets que fallaron por errores transitorios (500/502)
  if (failed.length > 0) {
    console.log(`\n↻ Reintentando ${failed.length} set(s) que fallaron...`);
    for (const [code, apiSet] of failed) {
      try {
        const cards = await fetchSetWithRetry(code, apiSet);
        for (const c of cards) {
          if (c.supertype !== 'Pokémon') continue;
          const key = `${c.name}-${code}-${normalizeCardNumber(c.number)}`;
          db[key] = mapApiToDb(code, c);
          count++;
        }
        console.log(`✓ ${code} (${apiSet}): ${cards.length} cards (reintento)`);
      } catch (e) {
        console.error(`✗ ${code} (${apiSet}) sigue fallando:`, (e as Error).message);
      }
      await new Promise((r) => setTimeout(r, SET_DELAY_MS));
    }
  }

  const entries = Object.entries(db)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');

  const out =
    `// AUTO-GENERATED by scripts/fetch-cards.ts — do not edit by hand.\n` +
    `// Refresh with: npm run update-cards (node scripts/fetch-cards.ts)\n` +
    `import type { CardData } from './decks';\n\n` +
    `export const generatedCards: Record<string, CardData> = {\n${entries}\n};\n\n` +
    `export default generatedCards;\n`;

  const outPath = new URL('../packages/core/src/data/cards.generated.ts', import.meta.url);
  writeFileSync(outPath, out);
  console.log(`\nWrote ${count} Pokémon cards to packages/core/src/data/cards.generated.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
