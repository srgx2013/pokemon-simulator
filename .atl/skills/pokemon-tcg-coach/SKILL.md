---
name: pokemon-tcg-coach
description: "Trigger: pokemon tcg strategy, prize mapping, sequencing, matchup, gameplan, play recommendation, state analysis, coach, entrenador, ruta de victoria. Competitive Pokémon TCG Standard-format strategy knowledge for analyzing game states and giving expert play recommendations."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Use this skill when analyzing a Pokémon TCG game state (e.g., the markdown exported by the simulator) and producing an expert play recommendation. It encodes competitive Standard-format strategy: prize mapping, sequencing, win conditions, tempo, and matchup awareness.

## Core Concepts

### Prize Mapping (the "path to victory")
- The goal is to plan, in advance, which of the opponent's Pokémon you will Knock Out and in what order, to reach 6 prizes before they do.
- Classify the opponent's board by prize value: single-prize (1) vs multi-prize (ex/V = 2, VMAX/VSTAR = 3).
- State your map explicitly, e.g. "2-2-2" (three 2-prize KOs) or "2-2-1-1".
- Sometimes the winning line is to IGNORE a hard multi-prize target and take single-prize KOs instead.
- Consider the opponent's own prize map and deny it (e.g., avoid benching a second 2-prize target when the opponent needs exactly two 2-prize KOs).

### Sequencing (optimal order of plays in a turn)
- Draw before you search (e.g., play draw Supporters before Ultra Ball) to maximize information.
- Play the least-committal cards first; keep options open.
- Search effects reveal information — use them only after you know what you need.
- Attach Energy and evolve AFTER resolving draw/search, unless the draw depends on the board state.
- Preserve resources: don't discard a card you might need later unless the search target is worth it.

### Win Conditions & Matchups
- Know your deck's win condition (e.g., Dragapult ex wins by spamming Phantom Dive: 200 damage + 6 bench damage counters).
- Know the opponent's win condition and disrupt it (e.g., vs a mill/control deck like Chandelure, avoid over-drawing; vs aggro, race prizes).
- Recognize tech cards that flip specific matchups.

### Tempo
- Track who is taking prizes faster. If behind, force aggressive trades; if ahead, consolidate and deny the opponent's path.

## Analysis Framework (how to read the simulator's markdown)

For the state provided, produce a structured answer:

1. **Scoreline** — prize counts and who is ahead.
2. **Immediate threats** — what the opponent can do next turn.
3. **Your resources** — hand, bench, energies, and available evolutions.
4. **Prize map** — the explicit sequence of KOs to reach 6 prizes (name each target and its prize value).
5. **Sequencing** — the optimal order of plays THIS turn.
6. **Recommendation** — one concrete line of play, with a fallback if the opponent disrupts.

## Heuristics

- Attack with the cheapest viable attacker; don't overcommit energy to a Pokémon that will be KOd.
- Keep a 1-prize attacker as a "sacrifice" to avoid giving up 2 prizes on a bad turn.
- If your Active can be KOd next turn and you can't prevent it, retreat it or bench a safer target.
- Spread damage (e.g., Phantom Dive's bench counters) to set up multi-KOs on low-HP bench Pokémon.
- Don't bench a second Pokémon ex/V when the opponent's win path is already "two 2-prize KOs".

## References

- PokeBeach — Prize Mapping Guide: https://www.pokebeach.com/2026/01/how-prize-mapping-wins-games-with-charizard-ex
- PokeBeach — Sequencing Guide: https://www.pokebeach.com/2024/02/steps-for-success-how-to-master-sequencing
- TCG Player — How to Sequence Correctly: https://www.tcgplayer.com/content/article/How-to-Sequence-Correctly-In-The-Pok%C3%A9mon-TCG/
- TCG Stacked (ES) — Prize Mapping: https://www.tcgstacked.com/es/pokemon/fundamentals/prize-mapping
- PrizeMap.app (practice): https://prizemap.app/
