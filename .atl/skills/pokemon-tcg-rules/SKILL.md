---
name: pokemon-tcg-rules
description: "Trigger: pokemon tcg rules, tcg rules, game rules, battle rules, energy, evolution, retreat, shuffle, deck building. Pokémon TCG core rules for simulator correctness."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Use this skill when reviewing, fixing, or implementing game logic in a Pokémon TCG simulator. It defines the core TCG rules that any simulator must respect.

## Hard Rules

### Deck Building
- A legal deck has exactly 60 cards.
- Maximum 4 copies of any card name (except basic Energy which has no limit).
- Pokémon ex, Pokémon V, etc. are still Pokémon cards and follow the same limit rule.

### Shuffle
- Every shuffle MUST produce a uniform random distribution (all permutations equally likely).
- `Array.sort(() => Math.random() - 0.5)` is BIASED and INVALID. Use Fisher-Yates (Durstenfeld) shuffle.

### Game Zones
- A card occupies exactly ONE zone at any time: deck, hand, discard, prizes, active, or bench.
- Moving a card from one zone to another MUST remove it from the source zone first or atomically.
- A Pokémon instance in `active` MUST NOT also appear in `bench` and vice versa.

### Active & Bench
- Each player has exactly 1 Active and up to 5 Bench slots.
- When a Pokémon moves from Bench to Active, remove it from its Bench slot.
- HP tracking: `currentHp = maxHp - damage`. Do NOT maintain independent `currentHp` and `damage` fields that can desync.

### Energy
- Basic Energy has no per-name limit.
- Energy attached to a Pokémon belongs to that specific Pokémon.
- Removing 1 Energy of a type when multiple exist removes exactly 1 copy of that type.

### Attacks
- An attack with an empty cost array (no energy symbols) costs zero energy and IS payable.
- An attack with cost `[]` is always usable regardless of attached energy.

### Prize Cards
- When a player's Active Pokémon is Knocked Out, that player takes 1 Prize card.
- If a Pokémon ex, V, or similar rule causes 2 Prize cards, the opponent takes 2.
- A player with 0 Prize cards remaining wins.

### Player Separation
- Each player has their OWN independent deck, hand, discard, prizes, active, and bench.
- Players NEVER share cards. A card can NEVER exist in both players' zones simultaneously.

### Mulligan
- If a player's opening hand has no Basic Pokémon, they shuffle back and redraw.
- The opponent may draw 1 extra card for each mulligan the other player takes.

## Decision Gates

| Situation | Action |
|---|---|
| A card moves zones | Remove from source atomically (or validate source is cleared) |
| HP changes | Update `damage`, derive `currentHp = maxHp - damage` |
| Shuffle needed | Use Fisher-Yates, never `sort(random)` |
| Pokemon moves from Bench to Active | Remove from bench slot and place in active |
| Energy removal with multiple copies | Remove exactly 1 copy of the specified type |
| Deck is empty at draw time | Player loses (deck-out rule) |

## Execution Steps

1. Before implementing any game mechanic, read the relevant Hard Rules above.
2. Use Fisher-Yates for ALL random operations.
3. Model HP as `damage` counters, not dual `currentHp` + `damage`.
4. Ensure all zone transitions remove from source before adding to destination.
5. Validate that each player's card pool is independent.

## References

- Official Pokémon TCG Rulebook: https://assets.pokemon.com/assets/cms2/pdf/play-gs/play-pokemon-tcg-rules.pdf
