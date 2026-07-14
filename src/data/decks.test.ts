import { describe, it, expect } from 'vitest';
import { parseDeckList, energyColors } from './decks';

// ─── parseDeckList (síncrono, heurístico) ────────────────────────────────────

describe('parseDeckList (síncrono)', () => {
  it('devuelve arrays vacíos para input vacío', () => {
    const result = parseDeckList('');
    expect(result.pokemon).toHaveLength(0);
    expect(result.trainers).toHaveLength(0);
    expect(result.energies).toHaveLength(0);
  });

  it('ignora líneas vacías y section headers', () => {
    const input = `Pokémon:
4 Dreepy TWM 128

Trainers:
    `;
    const result = parseDeckList(input);
    // "Dreepy" aparece con "Dreepy-TWM-128" en cardDatabase
    expect(result.pokemon.length).toBeGreaterThan(0);
  });

  // ── Pokémon con set code (formato: "4 Name SET 123") ──────────────────────────

  it('parsea Pokémon con formato "4 Name SET 123"', () => {
    const result = parseDeckList('4 Dreepy TWM 128');
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].name).toBe('Dreepy');
    expect(result.pokemon[0].stage).toBe('basic');
    expect(result.trainers).toHaveLength(0);
    expect(result.energies).toHaveLength(0);
  });

  it('parsea 1 sola copia correctamente', () => {
    const result = parseDeckList('1 Dreepy TWM 128');
    expect(result.pokemon).toHaveLength(1);
  });

  it('parsea Pokémon con HP y tipo reales de cardDatabase', () => {
    const result = parseDeckList('4 Dreepy TWM 128');
    expect(result.pokemon[0].hp).toBe(70);
    expect(result.pokemon[0].type).toBe('psychic');
  });

  // ── Pokémon con paréntesis: "4 Name (SET 123)" ────────────────────────────────

  it('parsea Pokémon con formato "4 Name (SET 123)"', () => {
    const result = parseDeckList('4 Dreepy (TWM 128)');
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].name).toBe('Dreepy');
  });

  // ── Pokémon sin set code: "4 Name" ────────────────────────────────────────────

  it('parsea Pokémon sin set code (name-only match)', () => {
    const result = parseDeckList('4 Duskull');
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].name).toBe('Duskull');
  });

  // ── Stage 1 y Stage 2 ──────────────────────────────────────────────────────────

  it('parsea Stage 1 (evolución)', () => {
    const result = parseDeckList('4 Drakloak TWM 129');
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].stage).toBe('stage1');
    expect(result.pokemon[0].evolvesFrom).toBe('Dreepy');
  });

  it('parsea Stage 2 y ex card', () => {
    const result = parseDeckList('4 Dragapult ex TWM 130');
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].hp).toBe(320);
    expect(result.pokemon[0].type).toBe('dragon');
  });

  // ── Trainer cards ──────────────────────────────────────────────────────────────

  it('parsea Supporter (Boss\'s Orders)', () => {
    const result = parseDeckList("4 Boss's Orders");
    expect(result.trainers).toHaveLength(4);
    expect(result.trainers[0].type).toBe('supporter');
    expect(result.pokemon).toHaveLength(0);
  });

  it('parsea Item (Ultra Ball)', () => {
    const result = parseDeckList('4 Ultra Ball');
    expect(result.trainers).toHaveLength(4);
    expect(result.trainers[0].type).toBe('item');
  });

  it('parsea Stadium (Jamming Tower)', () => {
    const result = parseDeckList('4 Jamming Tower');
    expect(result.trainers).toHaveLength(4);
    expect(result.trainers[0].type).toBe('stadium');
  });

  it('parsea múltiples trainers distintos', () => {
    const input = `2 Iono
2 Boss's Orders
1 Ultra Ball`;
    const result = parseDeckList(input);
    expect(result.trainers).toHaveLength(5);
    expect(result.pokemon).toHaveLength(0);
    expect(result.energies).toHaveLength(0);
  });

  // ── Energy cards ───────────────────────────────────────────────────────────────

  it('parsea energía básica "4 Psychic Energy"', () => {
    const result = parseDeckList('4 Psychic Energy');
    expect(result.energies).toHaveLength(4);
    expect(result.energies[0].type).toBe('psychic');
    expect(result.energies[0].quantity).toBe(1);
  });

  it('parsea energía Fire', () => {
    const result = parseDeckList('4 Fire Energy');
    expect(result.energies).toHaveLength(4);
    expect(result.energies[0].type).toBe('fire');
  });

  it('parsea energía Darkness', () => {
    const result = parseDeckList('9 Darkness Energy');
    expect(result.energies).toHaveLength(9);
    expect(result.energies[0].type).toBe('darkness');
  });

  it('parsea energía Grass', () => {
    const result = parseDeckList('3 Grass Energy');
    expect(result.energies).toHaveLength(3);
    expect(result.energies[0].type).toBe('grass');
  });

  it('parsea energía con set code "4 Psychic Energy MEE 7" ignorando el set', () => {
    const result = parseDeckList('4 Psychic Energy MEE 7');
    expect(result.energies).toHaveLength(4);
    expect(result.energies[0].type).toBe('psychic');
  });

  it('parsea energía Special', () => {
    const result = parseDeckList('4 Special Energy');
    expect(result.energies).toHaveLength(4);
    expect(result.energies[0].type).toBe('special');
  });

  it('parsea Spiky Energy como special (fallback)', () => {
    const result = parseDeckList('4 Spiky Energy JTG 159');
    expect(result.energies).toHaveLength(4);
    expect(result.energies[0].type).toBe('special');
    expect(result.pokemon).toHaveLength(0);
  });

  it('parsea Mist Energy como special (fallback)', () => {
    const result = parseDeckList('4 Mist Energy TEF 161');
    expect(result.energies).toHaveLength(4);
    expect(result.energies[0].type).toBe('special');
    expect(result.pokemon).toHaveLength(0);
  });

  it('diferencia energía de Pokémon que contiene "energy" en el nombre', () => {
    // "Energy" en el nombre no debería clasificar a un Pokémon como energía
    const result = parseDeckList('4 Fire Energy'); // Esto SÍ es energía
    expect(result.energies).toHaveLength(4);

    const result2 = parseDeckList('4 Psychic Energy');
    expect(result2.energies).toHaveLength(4);
  });

  // ── Mixed deck lists ──────────────────────────────────────────────────────────

  it('parsea un deck list completo y mezclado', () => {
    const input = `Pokémon:
4 Dreepy TWM 128
3 Drakloak TWM 129
2 Dragapult ex TWM 130
1 Fezandipiti ex SFA 38

Trainers:
2 Iono
2 Boss's Orders
4 Buddy-Buddy Poffin
1 Jamming Tower

Energy:
4 Psychic Energy
2 Fire Energy
`;

    const result = parseDeckList(input);

    // Pokémon: 4+3+2+1 = 10
    expect(result.pokemon).toHaveLength(10);
    expect(result.pokemon.filter(p => p.name === 'Dreepy')).toHaveLength(4);
    expect(result.pokemon.filter(p => p.name === 'Dragapult ex')).toHaveLength(2);

    // Trainers: 2+2+4+1 = 9
    expect(result.trainers).toHaveLength(9);
    expect(result.trainers.filter(t => t.name === 'Iono')).toHaveLength(2);
    expect(result.trainers.filter(t => t.name === "Boss's Orders")).toHaveLength(2);
    expect(result.trainers.filter(t => t.name === 'Jamming Tower')).toHaveLength(1);

    // Energías: 4+2 = 6
    expect(result.energies).toHaveLength(6);
    expect(result.energies.filter(e => e.type === 'psychic')).toHaveLength(4);
    expect(result.energies.filter(e => e.type === 'fire')).toHaveLength(2);
  });

  // ── Fallback: cartas desconocidas ──────────────────────────────────────────────

  it('crea Pokémon genérico para carta no encontrada en DB', () => {
    const result = parseDeckList('4 CompletelyFakePokemonName');
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].name).toBe('CompletelyFakePokemonName');
    expect(result.pokemon[0].hp).toBe(100);
    expect(result.pokemon[0].type).toBe('normal');
    expect(result.pokemon[0].stage).toBe('basic');
  });

  // ── Casos borde ────────────────────────────────────────────────────────────────

  it('no produce trainers ni energía si solo hay Pokémon', () => {
    const result = parseDeckList('4 Dreepy TWM 128');
    expect(result.trainers).toHaveLength(0);
    expect(result.energies).toHaveLength(0);
  });

  it('input con espacios extras y líneas en blanco', () => {
    const input = `  


    4    Dreepy    TWM    128


`;
    const result = parseDeckList(input);
    expect(result.pokemon).toHaveLength(4);
    expect(result.pokemon[0].name).toBe('Dreepy');
  });

  it('reconoce una carta sin set code pero con número en el nombre que la hace match', () => {
    // "Budew" tiene entradas en cardDatabase como Budew-PRE-4 y Budew-ASC-16
    const result = parseDeckList('2 Budew');
    expect(result.pokemon).toHaveLength(2);
    expect(result.pokemon[0].name).toBe('Budew');
  });

  // ── energyColors ───────────────────────────────────────────────────────────────

  it('energyColors tiene todas las energías básicas', () => {
    const required = ['fire', 'water', 'grass', 'electric', 'psychic', 'fighting', 'darkness', 'metal'];
    for (const t of required) {
      expect(energyColors[t]).toBeDefined();
      expect(energyColors[t]).toMatch(/^#/);
    }
  });

  it('energyColors incluye special y colorless', () => {
    expect(energyColors.special).toBeDefined();
    expect(energyColors.colorless).toBeDefined();
  });
});
