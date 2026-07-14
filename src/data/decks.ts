import type { DeckPreset, EnergyType } from '../types';

export const dragapultDeck: DeckPreset = {
  name: 'Dragapult Control',
  description: 'Control deck based on Dragapult ex with Dusknoir for prize manipulation',
  pokemon: [
    { name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic', attacks: [{ name: 'Quick Attack', cost: ['psychic'], damage: '30', description: '' }], retreatCost: 1, rarity: 'common' },
    { name: 'Drakloak', stage: 'stage1', hp: 90, type: 'psychic', evolvesFrom: 'Dreepy', attacks: [{ name: 'Pierce', cost: ['psychic', 'psychic'], damage: '50', description: '' }], retreatCost: 1, rarity: 'uncommon' },
    { name: 'Dragapult ex', stage: 'stage1', hp: 320, type: 'dragon', evolvesFrom: 'Drakloak', attacks: [{ name: 'Jet Headbutt', cost: ['normal'], damage: '70', description: '' }, { name: 'Phantom Dive', cost: ['fire', 'psychic'], damage: '200', description: 'Put 6 damage counters on your opponent\'s Benched Pokémon in any way you like.' }], retreatCost: 1, rarity: 'ultra' },
    { name: 'Duskull', stage: 'basic', hp: 60, type: 'psychic', attacks: [{ name: 'Come and Get You', cost: ['psychic'], damage: '0', description: 'Put up to 3 Duskull from your discard pile onto your Bench.' }, { name: 'Mumble', cost: ['psychic'], damage: '30', description: '' }], retreatCost: 1, rarity: 'common' },
    { name: 'Dusclops', stage: 'stage1', hp: 90, type: 'psychic', evolvesFrom: 'Duskull', attacks: [{ name: 'Cursed Blast', cost: ['psychic'], damage: '0', description: 'Once during your turn, you may put 5 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Fade to Black', cost: ['psychic', 'psychic'], damage: '50', description: '' }], retreatCost: 1, rarity: 'uncommon' },
    { name: 'Dusknoir', stage: 'stage2', hp: 160, type: 'psychic', evolvesFrom: 'Dusclops', attacks: [{ name: 'Grim Marker', cost: ['psychic', 'psychic'], damage: '60', description: 'If this Pokémon is in your discard pile, put 3 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Shadowy Touch', cost: ['psychic', 'psychic', 'psychic'], damage: '120', description: 'Switch 1 of your opponent\'s Benched Pokémon with their Active Pokémon.' }], retreatCost: 3, rarity: 'rare' },
    { name: 'Fezandipiti ex', stage: 'basic', hp: 210, type: 'grass', attacks: [{ name: 'Flit', cost: ['grass', 'grass'], damage: '50', description: '' }, { name: 'Grandflare', cost: ['grass', 'grass', 'grass'], damage: '130', description: '' }], weakness: { type: 'fire', value: '×2' }, retreatCost: 1, rarity: 'ultra' },
    { name: 'Munkidori', stage: 'basic', hp: 110, type: 'psychic', attacks: [{ name: 'Adrena-Brain', cost: ['psychic'], damage: '0', description: 'Once during your turn, if this Pokémon has any Darkness Energy attached, you may search your deck for a card and put it into your hand.' }, { name: 'Wretched Needle', cost: ['psychic', 'psychic'], damage: '60', description: 'Move 30 damage from this Pokémon to 1 of your opponent\'s Benched Pokémon.' }], weakness: { type: 'darkness', value: '×2' }, retreatCost: 1, rarity: 'uncommon' },
    { name: 'Hawlucha', stage: 'basic', hp: 70, type: 'fighting', attacks: [{ name: 'Flying Entry', cost: ['fighting'], damage: '0', description: 'When you play this Pokémon from your hand to your Bench during your turn, choose 2 of your opponent\'s Benched Pokémon and put 1 damage counter on each of them.' }, { name: 'Mach Cross', cost: ['fighting', 'fighting'], damage: '80', description: '' }], weakness: { type: 'psychic', value: '×2' }, retreatCost: 1, rarity: 'uncommon' },
    { name: 'Bloodmoon Ursaluna ex', stage: 'basic', hp: 260, type: 'fighting', attacks: [{ name: 'Seasoned Skill', cost: ['fighting'], damage: '0', description: 'Once during your turn, you may discard your hand and draw 5 cards.' }, { name: 'Blood Moon', cost: ['fighting', 'fighting', 'fighting'], damage: '220', description: 'During your next turn, this Pokémon can\'t attack.' }], retreatCost: 3, rarity: 'ultra' },
    { name: 'Latias ex', stage: 'basic', hp: 210, type: 'psychic', attacks: [{ name: 'Skyliner', cost: ['psychic'], damage: '0', description: 'Your Basic Pokémon in play have no Retreat Cost.' }, { name: 'Eon Blade', cost: ['psychic', 'psychic', 'psychic'], damage: '200', description: 'During your next turn, this Pokémon\'s Eon Blade attack does 200 more damage.' }], retreatCost: 1, rarity: 'ultra' },
    { name: 'Budew', stage: 'basic', hp: 30, type: 'grass', attacks: [{ name: 'Itchy Pollen', cost: ['grass'], damage: '10', description: 'During your opponent\'s next turn, they can\'t play any Item cards from their hand.' }], weakness: { type: 'fire', value: '×2' }, retreatCost: 1, rarity: 'common' },
  ],
  trainers: [
    { name: "Lillie's Determination", type: 'supporter', description: 'Draw 3 cards. If your opponent\'s Active Pokémon is a Pokémon ex, draw 3 more cards.', rarity: 'uncommon' },
    { name: 'Iono', type: 'supporter', description: 'Your opponent reveals their hand. You draw cards equal to the number of Trainer cards they revealed.', rarity: 'uncommon' },
    { name: "Boss's Orders", type: 'supporter', description: 'Switch 1 of your opponent\'s Benched Pokémon with their Active Pokémon.', rarity: 'rare' },
    { name: 'Buddy-Buddy Poffin', type: 'item', description: 'Put 2 Pokémon from your deck into your hand.', rarity: 'common' },
    { name: 'Counter Catcher', type: 'item', description: 'If your opponent\'s Active Pokémon has any damage counters on it, switch it with 1 of their Benched Pokémon.', rarity: 'rare' },
    { name: 'Night Stretcher', type: 'item', description: 'Put a Pokémon from your discard pile onto your Bench.', rarity: 'uncommon' },
    { name: 'Jamming Tower', type: 'stadium', description: 'Once during each player\'s turn, that player\'s opponent cannot play Pokémon from their hand during their first turn.', rarity: 'uncommon' },
    { name: 'Hilda', type: 'supporter', description: 'Choose 1 of your Pokémon and flip 3 coins. For each heads, put 1 damage counter on that Pokémon.', rarity: 'rare' },
    { name: 'Ultra Ball', type: 'item', description: 'Discard 2 cards from your hand. If you do, search your deck for a Pokémon, reveal it, and put it into your hand.', rarity: 'uncommon' },
    { name: 'PokePad', type: 'item', description: 'During your opponent\'s next turn, prevent all effects of attacks including damage done to your Active Pokémon by Pokémon with a Pokémon ex in their name.', rarity: 'uncommon' },
  ],
  energies: [
    { type: 'psychic', quantity: 2 },
    { type: 'fighting', quantity: 1 },
    { type: 'grass', quantity: 1 },
    { type: 'special', quantity: 4 },
  ],
};

export const charizardDeck: DeckPreset = {
  name: 'Charizard ex',
  description: 'Aggro deck using Charizard ex with high damage output',
  pokemon: [
    { name: 'Charmander', stage: 'basic', hp: 60, type: 'fire', attacks: [{ name: 'Ember', cost: ['fire'], damage: '30', description: '' }], retreatCost: 1, rarity: 'common' },
    { name: 'Charmeleon', stage: 'stage1', hp: 80, type: 'fire', evolvesFrom: 'Charmander', attacks: [{ name: 'Slash', cost: ['fire', 'fire'], damage: '50', description: '' }], retreatCost: 2, rarity: 'uncommon' },
    { name: 'Charizard ex', stage: 'stage2', hp: 330, type: 'fire', evolvesFrom: 'Charmeleon', attacks: [{ name: 'Infernal Reign', cost: ['fire', 'fire', 'fire'], damage: '100', description: 'You may discard 3 Energy from this Pokémon. If you do, this attack does 100 more damage.' }, { name: 'Fire Blast', cost: ['fire', 'fire', 'fire', 'fire'], damage: '250', description: '' }], weakness: { type: 'water', value: '×2' }, retreatCost: 2, rarity: 'ultra' },
    { name: 'Moltres', stage: 'basic', hp: 110, type: 'fire', attacks: [{ name: 'Wing Attack', cost: ['fire', 'fire'], damage: '60', description: '' }, { name: 'Recover', cost: ['fire', 'fire', 'fire'], damage: '80', description: 'Discard 1 Fire Energy from this Pokémon and attach it to 1 of your Benched Pokémon.' }], retreatCost: 2, rarity: 'rare' },
    { name: 'Pidgey', stage: 'basic', hp: 50, type: 'normal', attacks: [{ name: 'Peck', cost: ['normal'], damage: '20', description: '' }], retreatCost: 1, rarity: 'common' },
    { name: 'Pidgeotto', stage: 'stage1', hp: 80, type: 'normal', evolvesFrom: 'Pidgey', attacks: [{ name: 'Mirror Move', cost: ['normal', 'normal'], damage: '50', description: '' }], retreatCost: 1, rarity: 'uncommon' },
    { name: 'Ralts', stage: 'basic', hp: 60, type: 'psychic', attacks: [{ name: 'Psychic', cost: ['psychic'], damage: '20', description: 'Flip a coin. If heads, this attack does 20 more damage.' }], retreatCost: 1, rarity: 'common' },
    { name: 'Kirlia', stage: 'stage1', hp: 90, type: 'psychic', evolvesFrom: 'Ralts', attacks: [{ name: 'Psybeam', cost: ['psychic', 'psychic'], damage: '40', description: '' }], retreatCost: 1, rarity: 'uncommon' },
  ],
  trainers: [
    { name: "Professor's Research", type: 'supporter', description: 'Discard your hand and draw 7 cards.', rarity: 'uncommon' },
    { name: 'Nest Ball', type: 'item', description: 'Search your deck for a Basic Pokémon and put it onto your Bench.', rarity: 'uncommon' },
    { name: 'Switch', type: 'item', description: 'Switch your Active Pokémon with 1 of your Benched Pokémon.', rarity: 'common' },
    { name: 'Rare Candy', type: 'item', description: 'Evolve a Stage 1 Pokémon to Stage 2.', rarity: 'uncommon' },
    { name: 'Super Rod', type: 'item', description: 'Put 2 Pokémon from your discard pile into your hand.', rarity: 'rare' },
    { name: 'Fire Crystal', type: 'item', description: 'Attach a Fire Energy from your discard pile to 1 of your Pokémon.', rarity: 'rare' },
  ],
  energies: [
    { type: 'fire', quantity: 4 },
    { type: 'normal', quantity: 1 },
  ],
};

export const gardevoirDeck: DeckPreset = {
  name: 'Gardevoir ex',
  description: 'Mid-range deck using Gardevoir ex with Gallade support',
  pokemon: [
    { name: 'Ralts', stage: 'basic', hp: 60, type: 'psychic', attacks: [{ name: 'Psychic', cost: ['psychic'], damage: '20', description: '' }], retreatCost: 1, rarity: 'common' },
    { name: 'Kirlia', stage: 'stage1', hp: 90, type: 'psychic', evolvesFrom: 'Ralts', attacks: [{ name: 'Psybeam', cost: ['psychic', 'psychic'], damage: '40', description: '' }], retreatCost: 1, rarity: 'uncommon' },
    { name: 'Gardevoir ex', stage: 'stage2', hp: 310, type: 'psychic', evolvesFrom: 'Kirlia', attacks: [{ name: 'Psychic Embrace', cost: ['psychic', 'psychic'], damage: '0', description: 'Once during your turn, you may put 2 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Crystal Edge', cost: ['psychic', 'psychic', 'psychic', 'psychic'], damage: '180', description: '' }], weakness: { type: 'metal', value: '×2' }, retreatCost: 2, rarity: 'ultra' },
    { name: 'Gallade ex', stage: 'stage2', hp: 320, type: 'psychic', evolvesFrom: 'Kirlia', attacks: [{ name: 'Blade Form', cost: ['psychic', 'psychic', 'fighting'], damage: '90', description: '' }, { name: 'Aura Sword', cost: ['psychic', 'psychic', 'psychic', 'psychic'], damage: '150', description: '' }], weakness: { type: 'metal', value: '×2' }, retreatCost: 2, rarity: 'ultra' },
    { name: 'Wynaut', stage: 'basic', hp: 60, type: 'psychic', attacks: [{ name: 'Assist', cost: ['psychic'], damage: '20', description: '' }], retreatCost: 1, rarity: 'common' },
    { name: 'Wobbuffet', stage: 'stage1', hp: 100, type: 'psychic', evolvesFrom: 'Wynaut', attacks: [{ name: 'Mirror Coat', cost: ['psychic', 'psychic'], damage: '60', description: '' }], weakness: { type: 'metal', value: '×2' }, retreatCost: 2, rarity: 'uncommon' },
    { name: 'Crobat ex', stage: 'stage1', hp: 310, type: 'darkness', evolvesFrom: 'Zubat', attacks: [{ name: 'Venom', cost: ['darkness'], damage: '0', description: 'Once during your turn, you may discard 1 Energy from your opponent\'s Active Pokémon.' }, { name: 'Noxious Fang', cost: ['darkness', 'darkness', 'darkness'], damage: '120', description: '' }], weakness: { type: 'psychic', value: '×2' }, retreatCost: 1, rarity: 'ultra' },
  ],
  trainers: [
    { name: "Professor's Research", type: 'supporter', description: 'Discard your hand and draw 7 cards.', rarity: 'uncommon' },
    { name: 'Arven', type: 'supporter', description: 'Search your deck for an Item and a Pokémon tool, reveal them, and put them into your hand.', rarity: 'uncommon' },
    { name: 'Iono', type: 'supporter', description: 'Your opponent reveals their hand.', rarity: 'uncommon' },
    { name: 'Nest Ball', type: 'item', description: 'Search your deck for a Basic Pokémon and put it onto your Bench.', rarity: 'uncommon' },
    { name: 'Rare Candy', type: 'item', description: 'Evolve a Stage 1 Pokémon to Stage 2.', rarity: 'uncommon' },
    { name: 'Super Rod', type: 'item', description: 'Put 2 Pokémon from your discard pile into your hand.', rarity: 'rare' },
  ],
  energies: [
    { type: 'psychic', quantity: 4 },
    { type: 'darkness', quantity: 1 },
  ],
};

export const deckPresets: DeckPreset[] = [dragapultDeck, charizardDeck, gardevoirDeck];

export const energyTypes: EnergyType[] = [
  'fire', 'water', 'grass', 'electric', 'psychic', 'fighting', 
  'darkness', 'metal'
];

// Todos los tipos incluyendo los que no tienen energia basica (para visualizar cartas)
export const energyColors: Record<string, string> = {
  fire: '#FF6B35',
  water: '#4FA3D1',
  grass: '#78C850',
  electric: '#F8D030',
  psychic: '#F85888',
  fighting: '#C03028',
  darkness: '#705848',
  metal: '#B8A098',
  dragon: '#7038F8',
  fairy: '#EE99AC',
  normal: '#A8A878',
  special: '#9B7DFF',
  colorless: '#A8A878',
};

export interface CardData {
  name: string;
  set: string;
  num: string;
  hp: number;
  type: string;
  stage: 'basic' | 'stage1' | 'stage2';
  rarity: string;
  attacks: { name: string; cost: string[]; damage: string; description: string }[];
  evolvesFrom?: string;
  weakness?: { type: string; value: string };
  retreatCost: number;
}

export const cardDatabase: Record<string, CardData> = {
  // Dragapult Deck
  'Dreepy-TWM-128': { name: 'Dreepy', set: 'TWM', num: '128', hp: 70, type: 'psychic', stage: 'basic', rarity: 'common', attacks: [{ name: 'Quick Attack', cost: ['psychic'], damage: '30', description: '' }], retreatCost: 1 },
  'Drakloak-TWM-129': { name: 'Drakloak', set: 'TWM', num: '129', hp: 90, type: 'psychic', stage: 'stage1', rarity: 'uncommon', attacks: [{ name: 'Pierce', cost: ['psychic', 'psychic'], damage: '50', description: '' }], evolvesFrom: 'Dreepy', retreatCost: 1 },
  'Dragapult ex-TWM-130': { name: 'Dragapult ex', set: 'TWM', num: '130', hp: 320, type: 'dragon', stage: 'stage1', rarity: 'ultra', attacks: [{ name: 'Jet Headbutt', cost: ['normal'], damage: '70', description: '' }, { name: 'Phantom Dive', cost: ['fire', 'psychic'], damage: '200', description: 'Put 6 damage counters on your opponent\'s Benched Pokémon in any way you like.' }], evolvesFrom: 'Drakloak', retreatCost: 1 },
  'Duskull-PRE-35': { name: 'Duskull', set: 'PRE', num: '35', hp: 60, type: 'psychic', stage: 'basic', rarity: 'common', attacks: [{ name: 'Come and Get You', cost: ['psychic'], damage: '0', description: 'Put up to 3 Duskull from your discard pile onto your Bench.' }, { name: 'Mumble', cost: ['psychic'], damage: '30', description: '' }], retreatCost: 1 },
  'Duskull-SFA-18': { name: 'Duskull', set: 'SFA', num: '18', hp: 60, type: 'psychic', stage: 'basic', rarity: 'common', attacks: [{ name: 'Come and Get You', cost: ['psychic'], damage: '0', description: 'Put up to 3 Duskull from your discard pile onto your Bench.' }, { name: 'Mumble', cost: ['psychic'], damage: '30', description: '' }], retreatCost: 1 },
  'Dusclops-PRE-36': { name: 'Dusclops', set: 'PRE', num: '36', hp: 90, type: 'psychic', stage: 'stage1', rarity: 'uncommon', attacks: [{ name: 'Cursed Blast', cost: ['psychic'], damage: '0', description: 'Once during your turn, you may put 5 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Fade to Black', cost: ['psychic', 'psychic'], damage: '50', description: '' }], evolvesFrom: 'Duskull', retreatCost: 1 },
  'Dusclops-SFA-19': { name: 'Dusclops', set: 'SFA', num: '19', hp: 90, type: 'psychic', stage: 'stage1', rarity: 'uncommon', attacks: [{ name: 'Cursed Blast', cost: ['psychic'], damage: '0', description: 'Once during your turn, you may put 5 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Fade to Black', cost: ['psychic', 'psychic'], damage: '50', description: '' }], evolvesFrom: 'Duskull', retreatCost: 1 },
  'Dusknoir-SFA-20': { name: 'Dusknoir', set: 'SFA', num: '20', hp: 160, type: 'psychic', stage: 'stage2', rarity: 'rare', attacks: [{ name: 'Grim Marker', cost: ['psychic', 'psychic'], damage: '60', description: 'If this Pokémon is in your discard pile, put 3 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Shadowy Touch', cost: ['psychic', 'psychic', 'psychic'], damage: '120', description: 'Switch 1 of your opponent\'s Benched Pokémon with their Active Pokémon.' }], evolvesFrom: 'Dusclops', retreatCost: 3 },
  'Fezandipiti ex-SFA-38': { name: 'Fezandipiti ex', set: 'SFA', num: '38', hp: 210, type: 'grass', stage: 'basic', rarity: 'ultra', attacks: [{ name: 'Flit', cost: ['grass', 'grass'], damage: '50', description: '' }, { name: 'Grandflare', cost: ['grass', 'grass', 'grass'], damage: '130', description: '' }], weakness: { type: 'fire', value: '×2' }, retreatCost: 1 },
  'Munkidori-TWM-95': { name: 'Munkidori', set: 'TWM', num: '95', hp: 110, type: 'psychic', stage: 'basic', rarity: 'uncommon', attacks: [{ name: 'Adrena-Brain', cost: ['psychic'], damage: '0', description: 'Once during your turn, if this Pokémon has any Darkness Energy attached, you may search your deck for a card and put it into your hand.' }, { name: 'Wretched Needle', cost: ['psychic', 'psychic'], damage: '60', description: 'Move 30 damage from this Pokémon to 1 of your opponent\'s Benched Pokémon.' }], weakness: { type: 'darkness', value: '×2' }, retreatCost: 1 },
  'Hawlucha-SVI-118': { name: 'Hawlucha', set: 'SVI', num: '118', hp: 70, type: 'fighting', stage: 'basic', rarity: 'uncommon', attacks: [{ name: 'Flying Entry', cost: ['fighting'], damage: '0', description: 'When you play this Pokémon from your hand to your Bench during your turn, choose 2 of your opponent\'s Benched Pokémon and put 1 damage counter on each of them.' }, { name: 'Mach Cross', cost: ['fighting', 'fighting'], damage: '80', description: '' }], weakness: { type: 'psychic', value: '×2' }, retreatCost: 1 },
  'Bloodmoon Ursaluna ex-SVP-177': { name: 'Bloodmoon Ursaluna ex', set: 'SVP', num: '177', hp: 260, type: 'fighting', stage: 'basic', rarity: 'ultra', attacks: [{ name: 'Seasoned Skill', cost: ['fighting'], damage: '0', description: 'Once during your turn, you may discard your hand and draw 5 cards.' }, { name: 'Blood Moon', cost: ['fighting', 'fighting', 'fighting'], damage: '220', description: 'During your next turn, this Pokémon can\'t attack.' }], retreatCost: 3 },
  'Latias ex-SSP-220': { name: 'Latias ex', set: 'SSP', num: '220', hp: 210, type: 'psychic', stage: 'basic', rarity: 'ultra', attacks: [{ name: 'Skyliner', cost: ['psychic'], damage: '0', description: 'Your Basic Pokémon in play have no Retreat Cost.' }, { name: 'Eon Blade', cost: ['psychic', 'psychic', 'psychic'], damage: '200', description: 'During your next turn, this Pokémon\'s Eon Blade attack does 200 more damage.' }], retreatCost: 1 },
  'Budew-PRE-4': { name: 'Budew', set: 'PRE', num: '4', hp: 30, type: 'grass', stage: 'basic', rarity: 'common', attacks: [{ name: 'Itchy Pollen', cost: ['grass'], damage: '10', description: 'During your opponent\'s next turn, they can\'t play any Item cards from their hand.' }], weakness: { type: 'fire', value: '×2' }, retreatCost: 1 },
  // Grimmsnarl Deck
  "Marnie's Impidimp-DRI-134": { name: "Marnie's Impidimp", set: 'DRI', num: '134', hp: 70, type: 'darkness', stage: 'basic', rarity: 'common', attacks: [{ name: 'Filch', cost: ['darkness'], damage: '0', description: 'Draw a card.' }, { name: 'Corkscrew Punch', cost: ['darkness'], damage: '10', description: '' }], retreatCost: 1 },
  "Marnie's Morgrem-DRI-135": { name: "Marnie's Morgrem", set: 'DRI', num: '135', hp: 100, type: 'darkness', stage: 'stage1', rarity: 'uncommon', attacks: [{ name: 'Frighten', cost: ['darkness'], damage: '0', description: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Confused.' }, { name: 'Slash', cost: ['darkness', 'darkness'], damage: '60', description: '' }], evolvesFrom: "Marnie's Impidimp", retreatCost: 2 },
  "Marnie's Grimmsnarl ex-DRI-136": { name: "Marnie's Grimmsnarl ex", set: 'DRI', num: '136', hp: 320, type: 'darkness', stage: 'stage2', rarity: 'ultra', attacks: [{ name: 'Punk Up', cost: ['darkness'], damage: '0', description: 'When you play this Pokémon from your hand to your Bench during your turn, you may put 3 damage counters on 1 of your opponent\'s Pokémon.' }, { name: 'Dark Impact', cost: ['darkness', 'darkness', 'darkness'], damage: '180', description: '' }], evolvesFrom: "Marnie's Morgrem", retreatCost: 2 },
  'Snorunt-ASC-46': { name: 'Snorunt', set: 'ASC', num: '46', hp: 70, type: 'water', stage: 'basic', rarity: 'common', attacks: [{ name: 'Chilly', cost: ['water'], damage: '10', description: '' }], retreatCost: 1 },
  'Froslass-TWM-53': { name: 'Froslass', set: 'TWM', num: '53', hp: 90, type: 'water', stage: 'stage1', rarity: 'uncommon', attacks: [{ name: 'Freeze-Dry', cost: ['water'], damage: '30', description: 'Flip a coin. If heads, the opponent\'s Active Pokémon is now Paralyzed.' }, { name: 'Avalanche', cost: ['water', 'water'], damage: '80', description: '' }], evolvesFrom: 'Snorunt', retreatCost: 1 },
  'Tatsugiri-TWM-131': { name: 'Tatsugiri', set: 'TWM', num: '131', hp: 70, type: 'dragon', stage: 'basic', rarity: 'uncommon', attacks: [{ name: 'Attract Customers', cost: ['dragon'], damage: '0', description: 'Once during your turn, if this Pokémon is in the Active Spot, you may look at the top 6 cards of your deck and put 1 of them into your hand.' }, { name: 'Tail Whip', cost: ['dragon', 'colorless'], damage: '30', description: '' }], retreatCost: 1 },
  'Budew-ASC-16': { name: 'Budew', set: 'ASC', num: '16', hp: 30, type: 'grass', stage: 'basic', rarity: 'common', attacks: [{ name: 'Itchy Pollen', cost: ['grass'], damage: '10', description: 'During your opponent\'s next turn, they can\'t play any Item cards from their hand.' }], weakness: { type: 'fire', value: '×2' }, retreatCost: 1 },
  'Shaymin-DRI-10': { name: 'Shaymin', set: 'DRI', num: '10', hp: 70, type: 'grass', stage: 'basic', rarity: 'rare', attacks: [{ name: 'Flower Gift', cost: ['grass'], damage: '0', description: 'Once during your turn, you may search your deck for a Grass Energy and attach it to 1 of your Benched Pokémon.' }, { name: 'Magical Leaf', cost: ['grass', 'grass'], damage: '50', description: 'Flip a coin. If heads, heal 30 damage from this Pokémon.' }], weakness: { type: 'fire', value: '×2' }, retreatCost: 1 },
};

export function parseDeckList(text: string): { pokemon: any[], trainers: any[], energies: any[] } {
  const lines = text.trim().split('\n');
  const pokemon: any[] = [];
  const trainers: any[] = [];
  const energies: any[] = [];
  const skipped: string[] = [];
  
  const energyKeywords = ['psychic', 'fire', 'water', 'grass', 'electric', 'fighting', 'darkness', 'metal', 'dragon', 'fairy', 'normal', 'special'];
  const trainerNames = [
    "Lillie's Determination", 'Iono', "Boss's Orders", 'Buddy-Buddy Poffin',
    'Counter Catcher', 'Night Stretcher', 'Jamming Tower', 'Hilda',
    'Ultra Ball', 'PokePad', "Professor's Research", 'Nest Ball', 'Switch',
    'Rare Candy', 'Super Rod', 'Fire Crystal', 'Arven', 'Crisice Rider',
    'Poké Pad', 'Secret Box', 'Technical Machine', 'Bravery Charm', 'Spikemuth Gym', 'Artazon', 'Air Balloon', "Marnie's",
    'Poffin', 'Gym', 'Marnie', 'Pokemon Center Lady', 'Rai', 'Otmane', 'Kofu', 'Dominic', 'Kieran',
    'Crispin', 'Dawn', 'Crushing Hammer', 'Unfair Stamp', 'Special Red Card', 'Handheld Fan', "Team Rocket's Watchtower"
  ];
  
  // Trainer card prefixes that indicate it's definitely a trainer
  const trainerPrefixes = ["Lillie's", "Boss's", 'Iono', 'Arven', 'Hilda', "Professor'", 'Nest', 'Ultra', 'Rare', 'Super', 'Counter', 'Buddy-Buddy', 'Night', 'Jamming', 'Switch', 'Fire Crystal', 'Technical', 'Bravery', 'Spikemuth', 'Artazon', 'Air Balloon', 'Pokemon Center', 'Pokémon Center',
    'Crispin', 'Dawn', 'Crushing', 'Unfair', 'Red Card', 'Handheld', 'Team Rocket', "Rocket's"
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and section headers
    if (!trimmed || 
        trimmed.toLowerCase() === 'pokémon:' || 
        trimmed.toLowerCase() === 'pokemon:' || 
        trimmed.toLowerCase() === 'trainer:' || 
        trimmed.toLowerCase() === 'trainers:' ||
        trimmed.toLowerCase() === 'energy:') continue;
    
    // Check if this is an energy card first
    const isEnergy = energyKeywords.some(e => trimmed.toLowerCase().includes(e.toLowerCase())) && 
                     trimmed.toLowerCase().includes('energy');
    
    if (isEnergy) {
      // Pattern: "4 Psychic Energy" or "4 Psychic Energy MEE 7" or "9 Darkness Energy MEE 7"
      const energyMatch = trimmed.match(/^(\d+)\s+(.+?)\s+Energy/i);
      if (energyMatch) {
        const quantity = parseInt(energyMatch[1]);
        let energyType = energyMatch[2].toLowerCase();
        // Clean up energy type - remove set codes like MEE 7
        energyType = energyType.replace(/mee\s*\d+/i, '').replace(/\s+/g, '').trim();
        
        // Map common variations - ORDER MATTERS: check more specific first
        if (energyType.includes('darkness')) energyType = 'darkness';
        else if (energyType.includes('psychic')) energyType = 'psychic';
        else if (energyType.includes('fire')) energyType = 'fire';
        else if (energyType.includes('water')) energyType = 'water';
        else if (energyType.includes('grass')) energyType = 'grass';
        else if (energyType.includes('elec')) energyType = 'electric';
        else if (energyType.includes('fight')) energyType = 'fighting';
        else if (energyType.includes('metal')) energyType = 'metal';
        else if (energyType.includes('dragon')) energyType = 'dragon';
        else if (energyType.includes('fairy')) energyType = 'fairy';
        else if (energyType.includes('normal')) energyType = 'normal';
        else if (energyType.includes('special')) energyType = 'special';
        
        for (let i = 0; i < quantity; i++) {
          energies.push({ 
            type: energyType as EnergyType,
            quantity: 1 
          });
        }
        continue;
      }
    }
    
    // Parse line: extract quantity and card name
    // Pattern: "4 Munkidori TWM 95" or "4 Munkidori (TWM 95)" or "4 Munkidori"
    const match1 = trimmed.match(/^(\d+)\s+(.+?)\s+([A-Z]{2,4})\s+(\d+)$/);
    const match2 = trimmed.match(/^(\d+)\s+(.+?)\s+\(([A-Z]{2,4})\s+(\d+)\)$/);
    // Pattern 3: "4 Card Name" - no set info
    const match3 = trimmed.match(/^(\d+)\s+(.+)$/);
    
    let quantity: number, name: string, setInfo: string | null = null;
    
    if (match1) {
      quantity = parseInt(match1[1]);
      name = match1[2].trim();
      setInfo = match1[3] + ' ' + match1[4];
    } else if (match2) {
      quantity = parseInt(match2[1]);
      name = match2[2].trim();
      setInfo = match2[3] + ' ' + match2[4];
    } else if (match3) {
      quantity = parseInt(match3[1]);
      name = match3[2].trim();
      setInfo = null;
    } else {
      skipped.push(trimmed);
      continue;
    }
    
    // Clean name: remove any trailing set info that wasn't captured
    name = name.replace(/\s*\([A-Z]{2,4}\s*\d+\)\s*$/i, '').trim();
    name = name.replace(/\s+[A-Z]{2,4}\s+\d+\s*$/i, '').trim();
    
    // Check if it's a trainer first (before trying to find in Pokemon database)
    const isLikelyTrainer = trainerPrefixes.some(prefix => name.includes(prefix)) ||
                           trainerNames.some(t => name.toLowerCase().includes(t.toLowerCase()));
    
    if (isLikelyTrainer) {
      for (let i = 0; i < quantity; i++) {
        const isSupporter = name.includes('Boss') || name.includes("Lillie") || name.includes('Iono') || 
                           name.includes('Hilda') || name.includes('Arven') || name.includes('Professor') || 
                           name.includes('Marnie') || name.includes('Rai') || name.includes('Otmane') ||
                           name.includes('Kofu') || name.includes('Dominic') || name.includes('Kieran') ||
                               name.includes('Crispin') || name.includes('Dawn');
        const isStadium = name.includes('Gym') || name.includes('Stadium') || name.includes('Artazon') || name.includes('Pokemon Center') ||
                             name.includes('Tower') || name.includes('Watchtower');
        trainers.push({ 
          name, 
          type: isStadium ? 'stadium' : (isSupporter ? 'supporter' : 'item'),
          description: '', 
          rarity: 'uncommon' 
        });
      }
      continue;
    }
    
    // Try to match against the card database
    let foundCard: CardData | null = null;
    let matchType = '';
    
    if (setInfo) {
      // Try exact match with set info
      const cardKey = Object.keys(cardDatabase).find(k => {
        const cardName = k.split('-')[0].toLowerCase();
        const cardSet = k.split('-')[1];
        const cardNum = k.split('-')[2];
        
        const nameMatch = name.toLowerCase().includes(cardName);
        const setCode = setInfo.split(' ')[0].toUpperCase().replace('-', '');
        const setNum = setInfo.split(' ')[1]?.replace('-', '') || '';
        const setMatch = setCode === cardSet;
        const numMatch = setNum === cardNum || !setNum || !cardNum;
        
        return nameMatch && setMatch && numMatch;
      });
      
      if (cardKey && cardDatabase[cardKey]) {
        foundCard = cardDatabase[cardKey];
        matchType = 'exact';
      }
    }
    
    // Fallback: try name-only match if no set info or not found
    if (!foundCard) {
      const cardKey = Object.keys(cardDatabase).find(k => {
        const cardName = k.split('-')[0].toLowerCase();
        return name.toLowerCase().includes(cardName);
      });
      
      if (cardKey && cardDatabase[cardKey]) {
        foundCard = cardDatabase[cardKey];
        matchType = 'name-only';
      }
    }
    
    if (foundCard) {
      console.log(`Found: ${name} (${matchType}) x${quantity}`);
      for (let i = 0; i < quantity; i++) {
        pokemon.push({ ...foundCard, rarity: foundCard.rarity });
      }
    } else {
      // Ultimate fallback: create a basic Pokemon card with what we know
      console.log(`Creating fallback card for: ${name} x${quantity}`);
      const fallbackPokemon = {
        name: name,
        stage: 'basic' as const,
        hp: 100,
        type: 'normal',
        attacks: [],
        retreatCost: 1,
        rarity: 'common' as const,
      };
      for (let i = 0; i < quantity; i++) {
        pokemon.push(fallbackPokemon);
      }
    }
  }
  
  if (skipped.length > 0) {
    console.log('Skipped lines:', skipped);
  }
  
  console.log(`Import complete: ${pokemon.length} Pokemon, ${trainers.length} Trainers, ${energies.length} Energies`);
  
  return { pokemon, trainers, energies };
}

// ==========================================
// ASYNC VERSION WITH API LOOKUP
// ==========================================

import { fetchCard, convertApiCard, convertApiTrainer, convertApiEnergy, fetchCardFromTcgdex, convertTcgdexToCardData } from '../services/pokemonTcgApi';

// ── Fallback heurístico cuando la API no responde ──
// Solo se usa cuando la API de Pokémon TCG no puede identificar una carta.
// Clasifica por nombre como respaldo (energía > trainer > Pokémon genérico).
const FALLBACK_ENERGY_NAMES = ['psychic', 'fire', 'water', 'grass', 'electric', 'fighting', 'darkness', 'metal'];

const FALLBACK_TRAINER_NAMES = [
  "Lillie's", "Boss's", 'Iono', 'Arven', 'Hilda', "Professor's", 'Professor',
  'Nest Ball', 'Ultra Ball', 'Rare Candy', 'Super Rod', 'Switch',
  'Buddy-Buddy Poffin', 'Counter Catcher', 'Night Stretcher', 'Jamming Tower',
  'Fire Crystal', 'Technical Machine', 'Bravery Charm', 'Spikemuth Gym',
  'Artazon', 'Air Balloon', 'Pokemon Center', 'Crushing Hammer',
  'Unfair Stamp', 'Red Card', 'Handheld Fan', 'Team Rocket', "Rocket's",
  'Crispin', 'Dawn', 'PokePad', 'Poké Pad', 'Secret Box', 'Poffin',
  'Marnie', 'Rai', 'Kofu', 'Dominic', 'Kieran', 'Crispin', 'Eri', 'Bianca',
  'Lisia', 'Xerosic', 'Hand Trimmer', "Hero's Cape", 'Community Center',
  'Festival Grounds', 'Mega', 'Jumbo Ice Cream', 'Pokégear', 'PokéGear',
];

function classifyWithHeuristics(
  name: string,
  quantity: number,
  pokemon: any[],
  trainers: any[],
  energiesMap: Map<string, number>,
): void {
  // 1) Detectar energía por nombre
  const isEnergy = FALLBACK_ENERGY_NAMES.some(e => name.toLowerCase().includes(e)) &&
    name.toLowerCase().includes('energy');
  
  if (isEnergy) {
    const energyMatch = name.match(/(\w+)\s+Energy/i);
    if (energyMatch) {
      let t = energyMatch[1].toLowerCase();
      if (t.includes('darkness')) t = 'darkness';
      else if (t.includes('psychic')) t = 'psychic';
      else if (t.includes('fire')) t = 'fire';
      else if (t.includes('water')) t = 'water';
      else if (t.includes('grass')) t = 'grass';
      else if (t.includes('elec')) t = 'electric';
      else if (t.includes('fight')) t = 'fighting';
      else if (t.includes('metal')) t = 'metal';
      else if (t.includes('dragon')) t = 'dragon';
      else if (t.includes('fairy')) t = 'fairy';
      else if (t.includes('normal')) t = 'normal';
      else if (t.includes('special')) t = 'special';

      const existing = energiesMap.get(t) || 0;
      energiesMap.set(t, existing + quantity);
      return;
    }
  }

  // 2) Detectar trainer por nombre
  const isTrainer = FALLBACK_TRAINER_NAMES.some(t => name.includes(t));
  if (isTrainer) {
    const isSupporter = /boss|lillie|iono|hilda|arven|professor|marnie|crispin|dawn|bianca|lisia|xerosic|eri|raian|kofu|dominic|kieran/i.test(name);
    const isStadium = /gym|stadium|artazon|center|tower|watchtower|community|festival/i.test(name);
    const type = isStadium ? 'stadium' : isSupporter ? 'supporter' : 'item';
    for (let i = 0; i < quantity; i++) {
      trainers.push({ name, type, description: '', rarity: 'uncommon' });
    }
    return;
  }

  // 3) Fallback final: Pokémon genérico
  console.warn('Fallback: treating', name, 'as generic Pokemon');
  for (let i = 0; i < quantity; i++) {
    pokemon.push({
      name, stage: 'basic', hp: 100,
      type: 'normal', attacks: [], retreatCost: 1, rarity: 'common',
    });
  }
}

// Enhanced parse with API lookup — clasifica TODAS las cartas por supertype de la API
// en vez de usar heurísticas. Cada carta única se busca en la API y se clasifica como
// Pokémon, Trainer o Energy según el campo supertype de la respuesta.
export async function parseDeckListWithApi(
  text: string, 
  onProgress?: (current: number, total: number, cardName: string) => void
): Promise<{ pokemon: any[], trainers: any[], energies: any[] }> {
  const lines = text.trim().split('\n');
  const pokemon: any[] = [];
  const trainers: any[] = [];
  const energiesMap = new Map<string, number>();
  const skipped: string[] = [];

  // ── 1. Parsear líneas a objetos { name, set?, number?, quantity } ──
  interface CardEntry {
    name: string;
    set?: string;
    number?: string;
    quantity: number;
  }
  const allCards: CardEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^(pok[eé]mon|trainer|energy):/i.test(trimmed)) continue;

    // Intentar los 3 formatos: "4 Card Name SET 123", "4 Card Name (SET 123)", "4 Card Name"
    const match1 = trimmed.match(/^(\d+)\s+(.+?)\s+([A-Z]{2,4})\s+(\d+)$/);
    const match2 = trimmed.match(/^(\d+)\s+(.+?)\s+\(([A-Z]{2,4})\s+(\d+)\)$/);
    const match3 = trimmed.match(/^(\d+)\s+(.+)$/);

    let quantity: number, name: string, setInfo: string | null = null;

    if (match1) {
      quantity = parseInt(match1[1]);
      name = match1[2].trim();
      setInfo = match1[3] + ' ' + match1[4];
    } else if (match2) {
      quantity = parseInt(match2[1]);
      name = match2[2].trim();
      setInfo = match2[3] + ' ' + match2[4];
    } else if (match3) {
      quantity = parseInt(match3[1]);
      name = match3[2].trim();
      setInfo = null;
    } else {
      skipped.push(trimmed);
      continue;
    }

    // Limpiar nombre: remover set info residual
    name = name.replace(/\s*\([A-Z]{2,4}\s*\d+\)\s*$/i, '').trim();
    name = name.replace(/\s+[A-Z]{2,4}\s+\d+\s*$/i, '').trim();

    const setCode = setInfo ? setInfo.split(' ')[0] : undefined;
    const setNum = setInfo ? setInfo.split(' ')[1] : undefined;

    allCards.push({ name, set: setCode, number: setNum, quantity });
  }

  // ── 2. Buscar en API (deduplicado: same name+set+number = 1 call) ──
  // Agrupar por clave única para no llamar a la API 4 veces por 4 copias
  const grouped = new Map<string, { name: string; set?: string; number?: string; quantity: number }>();
  for (const card of allCards) {
    const key = `${card.name}::${card.set || ''}::${card.number || ''}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += card.quantity;
    } else {
      grouped.set(key, { ...card });
    }
  }

  const total = grouped.size;
  let current = 0;

  for (const [, entry] of grouped) {
    current++;
    onProgress?.(current, total, entry.name);

    const apiCard = await fetchCard(entry.name, entry.set, entry.number);

    if (apiCard && apiCard.supertype) {
      // API respondió — clasificar por supertype
      const supertype = apiCard.supertype;

      if (supertype === 'Pokémon' || supertype === 'Pokemon') {
        for (let i = 0; i < entry.quantity; i++) {
          pokemon.push(convertApiCard(apiCard));
        }
      } else if (supertype === 'Trainer') {
        const trainer = convertApiTrainer(apiCard);
        for (let i = 0; i < entry.quantity; i++) {
          trainers.push({ ...trainer });
        }
      } else if (supertype === 'Energy') {
        const energy = convertApiEnergy(apiCard);
        if (energy) {
          const existing = energiesMap.get(energy.type) || 0;
          energiesMap.set(energy.type, existing + entry.quantity);
        }
      } else {
        // supertype desconocido — tratar como Pokémon genérico
        console.warn("Unknown supertype " + supertype + " for " + entry.name + ", treating as Pokemon");
        for (let i = 0; i < entry.quantity; i++) {
          pokemon.push({
            name: entry.name, stage: 'basic', hp: 100,
            type: 'normal', attacks: [], retreatCost: 1, rarity: 'common',
          });
        }
      }
    } else {
      // API primaria falló — intentar con TCGdex
      const tcgCardRaw = await fetchCardFromTcgdex(entry.name);
      const tcgCard = tcgCardRaw ? convertTcgdexToCardData(tcgCardRaw) : null;

      if (tcgCard && tcgCard.supertype) {
        const supertype = tcgCard.supertype;
        if (supertype === 'Pokémon' || supertype === 'Pokemon') {
          for (let i = 0; i < entry.quantity; i++) {
            pokemon.push(convertApiCard(tcgCard));
          }
        } else if (supertype === 'Trainer') {
          const trainer = convertApiTrainer(tcgCard);
          for (let i = 0; i < entry.quantity; i++) {
            trainers.push({ ...trainer });
          }
        } else if (supertype === 'Energy') {
          const energy = convertApiEnergy(tcgCard);
          if (energy) {
            const existing = energiesMap.get(energy.type) || 0;
            energiesMap.set(energy.type, existing + entry.quantity);
          }
        } else {
          // TCGdex devolvió supertype desconocido — heuristics final
          classifyWithHeuristics(entry.name, entry.quantity, pokemon, trainers, energiesMap);
        }
      } else {
        // TCGdex tampoco encontró la carta — fallback heurístico final
        classifyWithHeuristics(entry.name, entry.quantity, pokemon, trainers, energiesMap);
      }
    }
  }

  // ── 3. Convertir el mapa de energías a array ──
  const energies: { type: EnergyType; quantity: number }[] = [];
  for (const [type, qty] of energiesMap) {
    energies.push({ type: type as EnergyType, quantity: qty });
  }

  if (skipped.length > 0) {
    console.log('Skipped lines:', skipped);
  }

  console.log(`Import with API complete: ${pokemon.length} Pokemon, ${trainers.length} Trainers, ${energies.length} Energy types`);

  return { pokemon, trainers, energies };
}