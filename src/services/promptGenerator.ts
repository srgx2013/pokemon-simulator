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

function buildDeckSection(deck: DeckPreset | null, label: string): string {
  if (!deck) {
    return `_${label} no cargado. Cargalo con "🎴 Nueva Partida" antes de generar el prompt._`;
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
    `${label} (solo estas cartas pueden aparecer en su tablero, con su HP):`,
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

${buildDeckSection(deck, 'MI MAZO')}

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

export function generateLogPrompt(
  player1Deck: DeckPreset | null,
  player2Deck: DeckPreset | null,
  playerName: string,
): string {
  return `Sos un extractor de estado de Pokémon TCG. Te paso el LOG de una partida de
Pokémon TCG Live (está en español) y las listas de ambos mazos. Reconstruí el
estado FINAL de la partida y devolvé SOLO JSON válido en exactamente este
formato (solo nombres y números; la app resuelve el resto):

{
  "turn": 3,
  "currentPlayer": "player1",
  "player1": {
    "active": { "name": "Dragapult ex", "hp": 320, "currentHp": 210,
                "attachedEnergy": ["fire", "psychic"], "status": "none" },
    "bench": [{ "name": "Drakloak", "hp": 90 }],
    "hand": [{ "name": "Lillie's Determination", "kind": "trainer" }],
    "prizes": 4,
    "discard": ["Fire Energy"],
    "deck": 20
  },
  "player2": { "active": { "name": "Comfey", "hp": 70 } }
}

${buildDeckSection(player1Deck, 'MI MAZO')}

${buildDeckSection(player2Deck, 'MAZO DEL RIVAL')}

Reglas:
- Yo soy ${playerName} → player1. El rival → player2.
  IMPORTANTE: ${playerName} SIEMPRE es player1. No lo inviertas.
- El log está en español; mapeá los nombres al inglés usando las listas de
  arriba (ej: "Órdenes de Jefes" = "Boss's Orders",
  "Maquinaciones de Xero" = "Xerosic's Machinations",
  "Camilla Nocturna" = "Night Stretcher", "Caramelo Raro" = "Rare Candy").
- Reconstruí el estado FINAL (cuando terminó la partida): Pokémon activos y
  en banca, HP actual (restá el daño del log), energías adjuntas, premios
  restantes, mano y deck de cada jugador.
- attachedEnergy en inglés: fire, water, grass, electric, psychic,
  fighting, darkness, metal, dragon, fairy, normal.
- status: none, poisoned, paralyzed, asleep, confused.
- Cartas boca abajo (mano rival, premios) y mazo restante: usá la CANTIDAD
  como número.`;
}
