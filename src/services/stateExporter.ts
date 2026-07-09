/**
 * SateExporter — genera un markdown completo del estado de juego
 * para que cualquier IA pueda analizarlo y recomendar jugadas.
 *
 * Funciones puras: no dependen de React, Zustand ni el DOM.
 */

import type {
  GameState,
  PlayerState,
  PokemonInstance,
  PokemonCard,
  TrainerCard,
  EnergyCard,
  EnergyType,
  StatusCondition,
  DeckPreset,
} from '../types';

// ─── Helpers de traducción ───────────────────────────────────────────────────

const ENERGY_NAMES: Record<string, string> = {
  fire: 'Fuego',
  water: 'Agua',
  grass: 'Planta',
  electric: 'Rayo',
  psychic: 'Psíquica',
  fighting: 'Lucha',
  darkness: 'Oscuridad',
  metal: 'Metal',
  dragon: 'Dragón',
  fairy: 'Hada',
  normal: 'Incolora',
  special: 'Especial',
};

const STATUS_NAMES: Record<StatusCondition, string> = {
  none: 'Normal',
  poisoned: 'Envenenado',
  poisoned1: 'Envenenado +1',
  poisoned2: 'Envenenado +2',
  poisoned3: 'Envenenado +3',
  paralyzed: 'Paralizado',
  asleep: 'Dormido',
  confused: 'Confuso',
};

const STAGE_NAMES: Record<string, string> = {
  basic: 'Básico',
  stage1: 'Fase 1',
  stage2: 'Fase 2',
};

// ─── Lógica de costos de energía ─────────────────────────────────────────────

/**
 * Determina si un conjunto de energías attached puede pagar el costo de un ataque.
 * `special` funciona como comodín (cualquier energía).
 */
export function canPayCost(
  cost: EnergyType[],
  attachedEnergy: EnergyType[],
): boolean {
  if (!cost || cost.length === 0) return false;

  const pool = [...attachedEnergy];

  for (const required of cost) {
    if (required === 'normal') {
      // Incolora: usa cualquier energía del pool
      const idx = pool.findIndex(() => true);
      if (idx === -1) return false;
      pool.splice(idx, 1);
    } else if (required === 'special') {
      // Special también funciona como comodín
      const idx = pool.findIndex(() => true);
      if (idx === -1) return false;
      pool.splice(idx, 1);
    } else {
      // Energía específica
      const idx = pool.indexOf(required);
      if (idx === -1) return false;
      pool.splice(idx, 1);
    }
  }
  return true;
}

/**
 * Formatea un array de EnergyType como string legible.
 */
function fmtEnergyList(energies: EnergyType[]): string {
  if (energies.length === 0) return 'Ninguna';
  return energies.map((e) => ENERGY_NAMES[e] ?? e).join(', ');
}

/**
 * Formatea el costo de un ataque como string ej: "Fuego + Incolora"
 */
function fmtAttackCost(cost: EnergyType[] | undefined): string {
  if (!cost || cost.length === 0) return '—';
  return cost.map((c) => ENERGY_NAMES[c] ?? c).join(' + ');
}

// ─── Análisis de evoluciones ─────────────────────────────────────────────────

interface EvolutionOption {
  from: string;        // nombre del Pokémon en campo
  fromLocation: 'active' | 'bench';
  to: string;          // nombre de la evolución en mano
  toStage: string;
}

/**
 * Busca evoluciones posibles: Pokémon en mano que pueden evolucionar
 * a Pokémon en active o bench del jugador.
 */
export function findEvolutions(
  hand: (PokemonCard | TrainerCard | EnergyCard)[],
  active: PokemonInstance | null,
  bench: (PokemonInstance | null)[],
): EvolutionOption[] {
  const field: { name: string; location: 'active' | 'bench' }[] = [];

  if (active) field.push({ name: active.card.name, location: 'active' });
  for (const p of bench) {
    if (p) field.push({ name: p.card.name, location: 'bench' });
  }

  const evolutions: EvolutionOption[] = [];

  for (const card of hand) {
    if (!('stage' in card)) continue; // no es Pokémon
    const pokemon = card as PokemonCard;
    if (!pokemon.evolvesFrom) continue; // no es evolución

    const match = field.find((f) => f.name === pokemon.evolvesFrom);
    if (match) {
      evolutions.push({
        from: match.name,
        fromLocation: match.location,
        to: pokemon.name,
        toStage: STAGE_NAMES[pokemon.stage] ?? pokemon.stage,
      });
    }
  }

  return evolutions;
}

// ─── Formateo de un Pokémon instance ────────────────────────────────────────

interface FormattedPokemon {
  name: string;
  hp: string;
  type: string;
  stage: string;
  energy: string;
  status: string;
  retreatCost: number;
  retreatReady: boolean;
  weakness: string;
  resistance: string;
  attacks: {
    name: string;
    damage: string;
    cost: string;
    description: string;
    usable: boolean;
  }[];
  evolutions: EvolutionOption[];
}

function formatPokemon(
  p: PokemonInstance,
  hand: (PokemonCard | TrainerCard | EnergyCard)[],
): FormattedPokemon {
  const evolutions = findEvolutions(hand, null, [])
    .filter((e) => e.from === p.card.name)
    .concat(
      findEvolutions(hand, p, [])
        .filter((e) => e.fromLocation === 'active' || e.fromLocation === 'bench'),
    );

  return {
    name: p.card.name,
    hp: `${p.currentHp}/${p.card.hp}`,
    type: ENERGY_NAMES[p.card.type] ?? p.card.type,
    stage: STAGE_NAMES[p.card.stage] ?? p.card.stage,
    energy: fmtEnergyList(p.attachedEnergy),
    status: STATUS_NAMES[p.status],
    retreatCost: p.card.retreatCost,
    retreatReady: p.attachedEnergy.length >= p.card.retreatCost,
    weakness: p.card.weakness
      ? `${ENERGY_NAMES[p.card.weakness.type] ?? p.card.weakness.type} (${p.card.weakness.value})`
      : '—',
    resistance: p.card.resistance
      ? `${ENERGY_NAMES[p.card.resistance.type] ?? p.card.resistance.type} (${p.card.resistance.value})`
      : '—',
    attacks: (p.card.attacks ?? []).map((a) => ({
      name: a.name,
      damage: a.damage || '0',
      cost: fmtAttackCost(a.cost),
      description: a.description || '—',
      usable: canPayCost(a.cost ?? [], p.attachedEnergy),
    })),
    evolutions,
  };
}

// ─── Renderizado Markdown ────────────────────────────────────────────────────

function renderPokemonSection(
  title: string,
  pokemon: PokemonInstance | null,
  hand: (PokemonCard | TrainerCard | EnergyCard)[],
  indent: string,
): string {
  if (!pokemon) return `${indent}**${title}:** Vacío\n`;

  const f = formatPokemon(pokemon, hand);
  const lines: string[] = [];
  lines.push(`${indent}**${title}:** ${f.name} (${f.hp} HP) · ${f.type} · ${f.stage}`);
  lines.push(`${indent}- Energía: ${f.energy} · Estado: ${f.status}`);
  lines.push(`${indent}- Debilidad: ${f.weakness} · Resistencia: ${f.resistance}`);
  lines.push(`${indent}- Retreat: ${f.retreatCost} energía ${f.retreatReady ? '✅' : '❌'}`);

  if (f.attacks.length > 0) {
    lines.push(`${indent}- Ataques:`);
    for (const a of f.attacks) {
      lines.push(`${indent}  - ${a.name}: **${a.damage}** daño (${a.cost}) ${a.usable ? '✅' : '❌'}`);
      if (a.description && a.description !== '—') {
        lines.push(`${indent}    → ${a.description}`);
      }
    }
  }

  if (f.evolutions.length > 0) {
    lines.push(`${indent}- **Evoluciones posibles:**`);
    for (const ev of f.evolutions) {
      lines.push(`${indent}  → ${ev.from} ↦ ${ev.to} (${ev.toStage})`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function renderBenchSection(
  bench: (PokemonInstance | null)[],
  hand: (PokemonCard | TrainerCard | EnergyCard)[],
): string {
  const occupied = bench.filter((p): p is PokemonInstance => p !== null);
  if (occupied.length === 0) return '  Bench: Vacío\n\n';

  const lines = occupied.map((p, i) => {
    const f = formatPokemon(p, hand);
    let block = `  **#${i + 1}:** ${f.name} (${f.hp} HP) · ${f.type} · ${f.stage}\n`;
    block += `    Energía: ${f.energy} · Estado: ${f.status}\n`;
    block += `    Debilidad: ${f.weakness} · Resistencia: ${f.resistance}\n`;
    block += `    Retreat: ${f.retreatCost} energía ${f.retreatReady ? '✅' : '❌'}\n`;

    if (f.attacks.length > 0) {
      block += `    Ataques:\n`;
      for (const a of f.attacks) {
        block += `      - ${a.name}: **${a.damage}** daño (${a.cost}) ${a.usable ? '✅' : '❌'}\n`;
      }
    }

    if (f.evolutions.length > 0) {
      block += `    **Evoluciones posibles:**\n`;
      for (const ev of f.evolutions) {
        block += `      → ${ev.from} ↦ ${ev.to} (${ev.toStage})\n`;
      }
    }

    return block;
  });

  return lines.join('\n');
}

function renderCardList(
  cards: (PokemonCard | TrainerCard | EnergyCard)[],
  label: string,
  showCount: boolean = true,
): string {
  if (cards.length === 0) {
    return `  **${label}:** Vacío\n\n`;
  }

  const header = showCount
    ? `  **${label}** (${cards.length} cartas):\n`
    : `  **${label}:**\n`;

  const items = cards.map((c) => {
    if ('stage' in c) {
      return `    - 🟢 ${c.name} (${STAGE_NAMES[c.stage] ?? c.stage} · ${c.hp} HP)`;
    }
    if ('type' in c && (c as EnergyCard).quantity !== undefined) {
      const en = getCardName(c);
      return `    - ⚡ ${en} (${(c as EnergyCard).quantity})`;
    }
    const trainer = c as TrainerCard;
    const icon = trainer.type === 'supporter' ? '🧑‍🤝‍🧑' : trainer.type === 'stadium' ? '🏟️' : '📦';
    return `    - ${icon} ${trainer.name} (${trainer.type})`;
  });

  return header + items.join('\n') + '\n\n';
}

function renderDeckContent(deck: DeckPreset | null): string {
  if (!deck) return '  _No hay mazo cargado_\n\n';

  const parts: string[] = [];
  parts.push(`  **Mazo:** ${deck.name}\n`);

  if (deck.pokemon.length > 0) {
    parts.push(`  Pokémon (${deck.pokemon.length}):`);
    for (const p of deck.pokemon) {
      parts.push(`    - ${p.name} (${STAGE_NAMES[p.stage] ?? p.stage} · ${p.hp} HP)`);
    }
    parts.push('');
  }

  if (deck.trainers.length > 0) {
    parts.push(`  Entrenadores (${deck.trainers.length}):`);
    for (const t of deck.trainers) {
      const icon = t.type === 'supporter' ? '🧑‍🤝‍🧑' : t.type === 'stadium' ? '🏟️' : '📦';
      parts.push(`    - ${icon} ${t.name} (${t.type})`);
    }
    parts.push('');
  }

  if (deck.energies.length > 0) {
    parts.push(`  Energías:`);
    for (const e of deck.energies) {
      parts.push(`    - ⚡ ${ENERGY_NAMES[e.type] ?? e.type} ×${e.quantity}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

// ─── Análisis de cartas jugables desde la mano ───────────────────────────────

interface PlayableCard {
  name: string;
  type: string;
  action: string;
}

function findPlayableCards(
  hand: (PokemonCard | TrainerCard | EnergyCard)[],
  playerState: PlayerState,
): PlayableCard[] {
  const result: PlayableCard[] = [];

  for (const card of hand) {
    if ('stage' in card) {
      const pokemon = card as PokemonCard;
      if (!pokemon.evolvesFrom) {
        result.push({
          name: pokemon.name,
          type: 'Pokémon',
          action: 'Jugar al Bench (Básico)',
        });
      } else {
        // Ver si hay a quien evolucionar
        const canEvolve =
          (playerState.active && playerState.active.card.name === pokemon.evolvesFrom) ||
          playerState.bench.some((p) => p && p.card.name === pokemon.evolvesFrom);
        if (canEvolve) {
          result.push({
            name: pokemon.name,
            type: 'Pokémon',
            action: `Evolucionar (${pokemon.evolvesFrom} → ${pokemon.name})`,
          });
        } else {
          result.push({
            name: pokemon.name,
            type: 'Pokémon',
            action: 'Sin objetivo de evolución en campo',
          });
        }
      }
    } else if ('type' in card && (card as EnergyCard).quantity !== undefined) {
      const energy = card as EnergyCard;
      result.push({
        name: energy.name || `${energy.energyType || energy.type} Energy`,
        type: 'Energía',
        action: 'Fijar a un Pokémon en campo',
      });
    } else {
      const trainer = card as TrainerCard;
      const action =
        trainer.type === 'supporter'
          ? 'Jugar (1 por turno)'
          : trainer.type === 'stadium'
            ? 'Jugar (reemplaza stadium activo)'
            : 'Jugar';
      result.push({
        name: trainer.name,
        type: trainer.type === 'supporter' ? 'Support' : trainer.type === 'stadium' ? 'Stadium' : 'Item',
        action,
      });
    }
  }

  return result;
}

// ─── Función principal ───────────────────────────────────────────────────────

export type SideLabel = 'Tú' | 'Rival';

export interface ExportOptions {
  /** Prefijo opcional para el system prompt. */
  customInstructions?: string;
  /** Idioma del output. Por ahora solo 'es'. */
  locale?: 'es';
}

const SYSTEM_PROMPT = `Eres un entrenador experto en Pokémon TCG con años de experiencia en torneos.
Analizás el estado de la partida y recomendás la jugada óptima.
Reglas de análisis:
1. Evaluá primero si podés atacar este turno (ataques disponibles ✅)
2. Si no podés atacar, priorizá preparar el siguiente turno (evolucionar, energizar, buscar cartas)
3. Considerá siempre el intercambio de Prizes: cuántos le quedan a cada uno
4. Si el rival tiene debilidad a tu tipo, explotá esa ventaja
5. Las evoluciones y los soportes son prioridad alta
6. Explicá tu razonamiento paso a paso, no des solo la respuesta final`;

/**
 * Genera el markdown completo del estado actual para ser usado por cualquier IA.
 */
export function exportStateToMarkdown(
  gameState: GameState,
  player1Deck: DeckPreset | null,
  player2Deck: DeckPreset | null,
  options: ExportOptions = {},
): string {
  const { player1, player2, currentPlayer, turn } = gameState;
  const locale = options.locale ?? 'es';

  const side: SideLabel = currentPlayer === 'player1' ? 'Tú' : 'Rival';
  const isPlayer1Turn = currentPlayer === 'player1';
  const current = isPlayer1Turn ? player1 : player2;
  const opponent = isPlayer1Turn ? player2 : player1;
  const currentDeck = isPlayer1Turn ? player1Deck : player2Deck;
  const opponentDeck = isPlayer1Turn ? player2Deck : player1Deck;

  // Prize differential
  const prizeDiff = player1.prizes.length - player2.prizes.length;

  const blocks: string[] = [];

  // ── Header / System prompt ─────────────────────────────────────────────
  blocks.push('# Pokémon TCG — Análisis de Estado');
  blocks.push('');
  blocks.push(options.customInstructions ?? SYSTEM_PROMPT);
  blocks.push('');
  blocks.push('---');
  blocks.push('');

  // ── Resumen general ────────────────────────────────────────────────────
  blocks.push('## Resumen');
  blocks.push('');
  blocks.push(`| Indicador | Valor |`);
  blocks.push(`|---|---|`);
  blocks.push(`| Turno | ${turn} |`);
  blocks.push(`| Turno de | ${side} |`);
  blocks.push(`| Tus Prizes restantes | ${player1.prizes.length}/6 |`);
  blocks.push(`| Prizes del rival | ${player2.prizes.length}/6 |`);
  blocks.push(
    `| Diferencia | ${
      prizeDiff < 0
        ? `Vas ${Math.abs(prizeDiff)} atrás 👇`
        : prizeDiff > 0
          ? `Vas ${prizeDiff} arriba 👆`
          : 'Empardados ➡️'
    } |`,
  );
  blocks.push('');

  if (player1.active === null && player2.active === null) {
    blocks.push('> ⚠️ **No hay Pokémon activos en juego.** Configurá los activos antes de analizar.');
    blocks.push('');
  }

  // ── Estado detallado: Tú ───────────────────────────────────────────────
  blocks.push('---');
  blocks.push('');
  blocks.push(`## ${isPlayer1Turn ? '▶️ Tú' : '👤 Tú'} (Jugador 1)`);
  blocks.push('');

  blocks.push(renderPokemonSection('Activo', current.active, current.hand, ''));
  blocks.push(renderBenchSection(current.bench, current.hand));
  blocks.push(renderCardList(current.hand, 'Mano'));
  blocks.push(renderCardList(current.discardPile, 'Descarte'));

  // Deck cargado (el preset completo)
  blocks.push(renderDeckContent(currentDeck));

  // Cartas restantes en el mazo (las que no se han robado)
  const remainingCards = current.deck;
  if (remainingCards.length > 0) {
    blocks.push(`  **Quedan ${remainingCards.length} cartas en el mazo** (ordenadas según quedaron):\n`);
    const grouped = groupCardsByName(remainingCards);
    for (const [name, cards] of Object.entries(grouped)) {
      const first = cards[0];
      if ('stage' in first) {
        blocks.push(`    - 🟢 ${name} ×${cards.length}`);
      } else if ('type' in first && (first as EnergyCard).quantity !== undefined) {
        blocks.push(`    - ⚡ ${name} ×${cards.length}`);
      } else {
        blocks.push(`    - 📦 ${name} ×${cards.length}`);
      }
    }
    blocks.push('');
  }

  blocks.push(renderCardList(current.prizes, 'Prizes'));

  // ── Estado detallado: Rival ────────────────────────────────────────────
  blocks.push('---');
  blocks.push('');
  blocks.push(`## ${isPlayer1Turn ? '👤 Rival' : '▶️ Rival'} (Jugador 2)`);
  blocks.push('');
  blocks.push(renderPokemonSection('Activo', opponent.active, opponent.hand, ''));
  blocks.push(renderBenchSection(opponent.bench, opponent.hand));
  blocks.push(renderCardList(opponent.hand, 'Mano (visible por ser simulador)'));
  blocks.push(renderCardList(opponent.discardPile, 'Descarte'));
  blocks.push(renderDeckContent(opponentDeck));

  const remainingOppCards = opponent.deck;
  if (remainingOppCards.length > 0) {
    blocks.push(`  **Quedan ${remainingOppCards.length} cartas en el mazo rival:**\n`);
    const grouped = groupCardsByName(remainingOppCards);
    for (const [name, cards] of Object.entries(grouped)) {
      const first = cards[0];
      if ('stage' in first) {
        blocks.push(`    - 🟢 ${name} ×${cards.length}`);
      } else if ('type' in first && (first as EnergyCard).quantity !== undefined) {
        blocks.push(`    - ⚡ ${name} ×${cards.length}`);
      } else {
        blocks.push(`    - 📦 ${name} ×${cards.length}`);
      }
    }
    blocks.push('');
  }

  blocks.push(renderCardList(opponent.prizes, 'Prizes'));

  // ── Opciones de jugada ──────────────────────────────────────────────────
  blocks.push('---');
  blocks.push('');
  blocks.push('## Opciones de Jugada');
  blocks.push('');

  // Ataques disponibles del activo
  const activeInstance = current.active;
  if (activeInstance) {
    const usableAttacks = (activeInstance.card.attacks ?? []).filter((a) =>
      canPayCost(a.cost ?? [], activeInstance.attachedEnergy),
    );
    if (usableAttacks.length > 0) {
      blocks.push('### Ataques disponibles');
      blocks.push('');
      for (const a of usableAttacks) {
        blocks.push(`- **${a.name}:** ${a.damage} daño (${fmtAttackCost(a.cost)})`);
        if (a.description) blocks.push(`  → ${a.description}`);
        blocks.push('');
      }
    } else {
      blocks.push('❌ **No tenés ataques disponibles** — necesitás energizar o cambiar de Pokémon.');
      blocks.push('');
    }
  }

  // Evoluciones posibles generales
  const allEvolutions = findEvolutions(current.hand, current.active, current.bench);
  if (allEvolutions.length > 0) {
    blocks.push('### Evoluciones posibles');
    blocks.push('');
    for (const ev of allEvolutions) {
      const loc = ev.fromLocation === 'active' ? 'Activo' : `Bench #${ev.fromLocation === 'bench' ? '?' : ''}`;
      blocks.push(`- **${ev.from}** (${loc}) → **${ev.to}** (${ev.toStage})`);
    }
    blocks.push('');
  }

  // Cartas jugables desde mano
  const playable = findPlayableCards(current.hand, current);
  if (playable.length > 0) {
    blocks.push('### Cartas en mano jugables');
    blocks.push('');
    for (const p of playable) {
      blocks.push(`- **${p.name}** (${p.type}): ${p.action}`);
    }
    blocks.push('');
  }

  // Retreat
  if (activeInstance) {
    const canRetreat = activeInstance.attachedEnergy.length >= activeInstance.card.retreatCost;
    const hasBenchTarget = current.bench.some((p) => p !== null);
    if (canRetreat && hasBenchTarget) {
      blocks.push('### Retreat disponible');
      blocks.push('');
      blocks.push(
        `Podés retirar a **${activeInstance.card.name}** (${activeInstance.card.retreatCost} energía) y pasar a un Pokémon del Bench.`,
      );
      blocks.push('');
    } else if (!hasBenchTarget && activeInstance) {
      blocks.push('⚠️ No podés retirar — no hay Pokémon en el Bench.');
      blocks.push('');
    }
  }

  // ── Recomendación (espacio para que la IA complete) ────────────────────
  blocks.push('---');
  blocks.push('');
  blocks.push('## Análisis y Recomendación');
  blocks.push('');
  blocks.push('*(La IA completa esta sección después de analizar el estado)*');
  blocks.push('');

  return blocks.join('\n');
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Obtiene el nombre de una carta de forma robusta,
 * manejando tanto el formato EnergyCard como objetos legacy sin name.
 */
function getCardName(c: PokemonCard | TrainerCard | EnergyCard): string {
  if ('stage' in c) return c.name;
  if ('quantity' in c) {
    const e = c as any;
    return e.name || `${e.energyType || e.type || 'unknown'} Energy`;
  }
  return (c as TrainerCard).name;
}

function groupCardsByName(
  cards: (PokemonCard | TrainerCard | EnergyCard)[],
): Record<string, (PokemonCard | TrainerCard | EnergyCard)[]> {
  const grouped: Record<string, (PokemonCard | TrainerCard | EnergyCard)[]> = {};
  for (const c of cards) {
    const key = 'stage' in c ? c.name : 'quantity' in c ? `${(c as EnergyCard).type} Energy` : (c as TrainerCard).name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }
  return grouped;
}

/**
 * Versión simplificada del estado para copiado rápido (sin tanto detalle).
 */
export function exportStateShort(
  gameState: GameState,
): string {
  const { player1, player2, currentPlayer, turn } = gameState;
  const isP1 = currentPlayer === 'player1';

  const fmtPokemon = (p: PokemonInstance | null): string => {
    if (!p) return 'Vacío';
    const attacks = (p.card.attacks ?? [])
      .map((a) => `${a.name}(${a.damage}, ${fmtAttackCost(a.cost)}${canPayCost(a.cost ?? [], p.attachedEnergy) ? '✅' : '❌'})`)
      .join(', ');
    return `${p.card.name} ${p.currentHp}/${p.card.hp}HP [${fmtEnergyList(p.attachedEnergy)}] ${attacks}`;
  };

  return `## Pokémon TCG — Turno ${turn}

**Turno de:** ${isP1 ? 'Jugador 1 (Tú)' : 'Jugador 2 (Rival)'}

### Tú (Jugador 1)
- Activo: ${fmtPokemon(player1.active)}
- Bench: ${player1.bench.filter(Boolean).length} Pokémon
- Mano: ${player1.hand.map((c) => getCardName(c)).join(', ') || 'Vacía'}
- Deck: ${player1.deck.length} cartas
- Descarte: ${player1.discardPile.map((c) => getCardName(c)).join(', ') || 'Vacío'}
- Prizes: ${player1.prizes.length}/6

### Rival (Jugador 2)
- Activo: ${fmtPokemon(player2.active)}
- Bench: ${player2.bench.filter(Boolean).length} Pokémon
- Mano: ${player2.hand.map((c) => getCardName(c)).join(', ') || 'Vacía'}
- Deck: ${player2.deck.length} cartas
- Descarte: ${player2.discardPile.map((c) => getCardName(c)).join(', ') || 'Vacío'}
- Prizes: ${player2.prizes.length}/6

### Pregunta
¿Cuál es la mejor jugada para el jugador actual?`;
}


