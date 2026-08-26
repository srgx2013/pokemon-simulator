/**
 * PromptGenerator — genera el prompt para la IA del Camino A.
 *
 * Produce un prompt listo para copiar que incluye el formato JSON esperado,
 * la lista única del mazo del usuario (Pokémon con HP, entrenadores, energías)
 * y las reglas de extracción. La lista del mazo es la pieza clave para que la
 * IA NO alucine cartas: reduce el espacio de búsqueda de miles de cartas a las
 * que realmente están en el mazo del usuario.
 *
 * Función pura: no depende de React, Zustand ni el DOM.
 */

import type { DeckPreset } from '../types';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uniqueBy<T>(arr: T[], key: (item: T) => string): T[] {
  return [...new Map(arr.map((item) => [key(item), item])).values()];
}

function energyLabel(e: { name?: string; type: string }): string {
  return e.name || `${capitalize(e.type)} Energy`;
}

function buildDeckSection(deck: DeckPreset | null): string {
  if (!deck) {
    return '_No tenés mazo cargado. Cargá tu mazo con "🎴 Nueva Partida" antes de generar el prompt._';
  }

  const pokemon = uniqueBy(deck.pokemon, (p) => p.name)
    .map((p) => `${p.name} (${p.hp})`)
    .join(', ');
  const trainers = uniqueBy(deck.trainers, (t) => t.name)
    .map((t) => t.name)
    .join(', ');
  const energies = uniqueBy(deck.energies, energyLabel)
    .map(energyLabel)
    .join(', ');

  return [
    'MI MAZO (solo estas cartas pueden estar en mi tablero, con su HP):',
    `- Pokémon: ${pokemon}`,
    `- Entrenadores: ${trainers}`,
    `- Energías: ${energies}`,
  ].join('\n');
}

export function generateImportPrompt(deck: DeckPreset | null): string {
  return `Sos un extractor de estado de Pokémon TCG. Te paso una captura de
Pokémon TCG Live y la lista de mi mazo. Devolvé SOLO JSON válido (sin
comentarios ni texto alrededor), en exactamente este formato:

{
  "turn": 3,
  "currentPlayer": "player1",
  "player1": {
    "active": { "name": "Dragapult ex", "hp": 320, "currentHp": 320,
                "attachedEnergy": ["fire", "psychic"], "status": "none" },
    "bench": [{ "name": "Drakloak", "hp": 90 }],
    "hand": [{ "name": "Lillie's Determination", "kind": "trainer" }],
    "prizes": 6,
    "discard": ["Fire Energy"],
    "deck": 49
  },
  "player2": { "active": { "name": "Meowscarada ex", "hp": 310 } }
}

${buildDeckSection(deck)}

Reglas:
- player1 = mi lado (abajo), player2 = el rival (arriba).
- Identificá cada carta de MI lado SOLO de la lista de mi mazo (usá el HP
  para desambiguar cartas parecidas). Si una carta no matchea claramente
  con ninguna de la lista, dejá ese slot vacío en vez de adivinar.
  NO inventes cartas que no estén en la lista.
- Usá los nombres EXACTOS de la lista (en inglés).
- attachedEnergy en inglés: fire, water, grass, electric, psychic,
  fighting, darkness, metal, dragon, fairy, normal.
- status: none, poisoned, paralyzed, asleep, confused.
- Cartas boca abajo (mano rival, premios) y mazo restante: poné la CANTIDAD como número.
- En el descarte solo se ve la carta de arriba.`;
}
