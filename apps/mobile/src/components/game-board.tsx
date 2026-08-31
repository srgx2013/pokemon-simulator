import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import type {
  DeckPreset,
  PlayerState,
  PokemonInstance,
  StatusCondition,
} from '@pokemon-simulator/core/types';
import { energyColors } from '@pokemon-simulator/core/data/decks';
import { useStorage } from '@/hooks/useStorage';
import { PokemonCardView } from './pokemon-card-view';
import {
  computeAttachedCounts,
  computeEnergyLimits,
  energyPoolForDeck,
  findPokemonInstance,
  isEnergyAtLimit,
} from '@/lib/boardState';
import { classifyCard, groupPokemonByCard, pokemonInDeck, type PokemonGroup } from '@/lib/deckUtils';

type Side = 'player1' | 'player2';
type ZoneKey = 'deck' | 'hand' | 'discard' | 'prizes';
type ZoneTab = 'all' | 'pokemon' | 'trainer' | 'energy';

const BASIC_ENERGY = [
  { t: 'fire', icon: '🔥', label: 'Fuego' },
  { t: 'water', icon: '💧', label: 'Agua' },
  { t: 'grass', icon: '🌿', label: 'Planta' },
  { t: 'electric', icon: '⚡', label: 'Rayo' },
  { t: 'psychic', icon: '🧠', label: 'Psiquica' },
  { t: 'fighting', icon: '👊', label: 'Lucha' },
  { t: 'darkness', icon: '🌑', label: 'Oscuridad' },
  { t: 'metal', icon: '🛡', label: 'Metal' },
];

const STATUS_OPTIONS: { value: StatusCondition; label: string }[] = [
  { value: 'none', label: 'Ninguno' },
  { value: 'poisoned', label: 'Envenenado' },
  { value: 'poisoned1', label: '+1' },
  { value: 'poisoned2', label: '+2' },
  { value: 'poisoned3', label: '+3' },
  { value: 'paralyzed', label: 'Paralizado' },
  { value: 'asleep', label: 'Dormido' },
  { value: 'confused', label: 'Confuso' },
];

const ZONE_TITLES: Record<ZoneKey, string> = {
  deck: '📚 Deck',
  hand: '🃏 Mano',
  discard: '🗑️ Descarte',
  prizes: '🏆 Premios',
};

const MAX_PRIZES = 6;

const zoneLabel = (card: unknown): string => {
  const kind = classifyCard(card);
  if (kind === 'pokemon') return 'Pokémon';
  if (kind === 'energy') return 'Energía';
  return 'Entrenador';
};

// ── Modal: pick a pokemon from the deck to place (active or bench) ────────────

function PokemonPickerModal({
  visible,
  label,
  groups,
  onSelect,
  onClose,
}: {
  visible: boolean;
  label: string;
  groups: PokemonGroup[];
  onSelect: (firstIndex: number) => void;
  onClose: () => void;
}) {
  const total = groups.reduce((s, g) => s + g.count, 0);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Pokémon ({label}) — {total} cartas
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.pickerList}>
            {groups.length === 0 ? (
              <Text style={styles.emptyText}>No hay Pokémon en el deck</Text>
            ) : (
              groups.map(g => (
                <Pressable key={g.name} style={styles.pickerRow} onPress={() => onSelect(g.firstIndex)}>
                  <View style={styles.pickerRowLeft}>
                    <Text style={styles.pickerName}>{g.name}</Text>
                    <Text style={styles.pickerInfo}>
                      {g.stage} • {g.hp}HP
                    </Text>
                  </View>
                  <Text style={styles.pickerCount}>×{g.count}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Modal: edit a pokemon in play (HP, status, energy, remove) ────────────────

function EditPokemonSheet({
  visible,
  pokemon,
  deckPreset,
  discardPile,
  attachedCounts,
  onHp,
  onAddDamage,
  onAddEnergy,
  onRemoveEnergy,
  onSetStatus,
  onRemove,
  onClose,
}: {
  visible: boolean;
  pokemon: PokemonInstance;
  deckPreset: DeckPreset | null;
  discardPile: unknown[];
  /** Side-wide attached energy counts (the energy pool is shared across the side). */
  attachedCounts: Record<string, number>;
  onHp: (hp: number) => void;
  /** Adds (+10) or removes (-10, clamped at 0) damage counters via core addDamage. */
  onAddDamage: (delta: number) => void;
  onAddEnergy: (key: string) => void;
  onRemoveEnergy: (key: string) => void;
  onSetStatus: (status: StatusCondition) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const pool = energyPoolForDeck(deckPreset);
  const limits = computeEnergyLimits(deckPreset, discardPile);
  const atLimit = (key: string): boolean => isEnergyAtLimit(limits, attachedCounts, key);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✏️ {pokemon.card.name}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>HP</Text>
              <View style={styles.hpControls}>
                <Pressable style={styles.hpBtn} onPress={() => onHp(pokemon.currentHp - 10)}>
                  <Text style={styles.hpBtnText}>-10</Text>
                </Pressable>
                <Text style={styles.hpValue}>{pokemon.currentHp}</Text>
                <Pressable style={styles.hpBtn} onPress={() => onHp(pokemon.currentHp + 10)}>
                  <Text style={styles.hpBtnText}>+10</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Daño</Text>
              <View style={styles.hpControls}>
                <Pressable style={styles.hpBtn} onPress={() => onAddDamage(-10)} disabled={pokemon.damage === 0}>
                  <Text style={styles.hpBtnText}>-10</Text>
                </Pressable>
                <Text style={styles.hpValue}>{pokemon.damage}</Text>
                <Pressable style={styles.hpBtn} onPress={() => onAddDamage(10)}>
                  <Text style={styles.hpBtnText}>+10</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Estado</Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map(s => (
                  <Pressable
                    key={s.value}
                    style={[styles.statusChip, pokemon.status === s.value && styles.statusChipActive]}
                    onPress={() => onSetStatus(s.value)}
                  >
                    <Text style={[styles.statusChipText, pokemon.status === s.value && styles.statusChipTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Energía ({pokemon.attachedEnergy.length})</Text>
              <View style={styles.energyGrid}>
                {BASIC_ENERGY.filter(e => pool.basicTypes.length === 0 || pool.basicTypes.includes(e.t)).map(
                  ({ t, icon }) => {
                    const count = pokemon.attachedEnergy.filter(e => e === t).length;
                    return (
                      <View key={t} style={styles.energyCounter}>
                        <Pressable style={styles.energyBtn} onPress={() => onRemoveEnergy(t)} disabled={count === 0}>
                          <Text style={styles.energyBtnText}>−</Text>
                        </Pressable>
                        <View style={[styles.energyCountBadge, { backgroundColor: count > 0 ? energyColors[t] : '#333' }]}>
                          <Text style={styles.energyCountIcon}>{icon}</Text>
                          <Text style={styles.energyCountNumber}>{count}</Text>
                        </View>
                        <Pressable style={styles.energyBtn} onPress={() => onAddEnergy(t)} disabled={atLimit(t)}>
                          <Text style={styles.energyBtnText}>+</Text>
                        </Pressable>
                      </View>
                    );
                  },
                )}
                {pool.specials.map(sp => {
                  const count = pokemon.attachedEnergy.filter(e => e === sp.name).length;
                  return (
                    <View key={sp.name} style={styles.energyCounter}>
                      <Pressable style={styles.energyBtn} onPress={() => onRemoveEnergy(sp.name)} disabled={count === 0}>
                        <Text style={styles.energyBtnText}>−</Text>
                      </Pressable>
                      <View style={[styles.energyCountBadge, { backgroundColor: count > 0 ? '#9B7DFF' : '#333' }]}>
                        <Text style={styles.specialEnergyLabel} numberOfLines={1}>
                          {sp.name.replace(' Energy', '').slice(0, 8)}
                        </Text>
                        <Text style={styles.energyCountNumber}>{count}</Text>
                      </View>
                      <Pressable style={styles.energyBtn} onPress={() => onAddEnergy(sp.name)} disabled={atLimit(sp.name)}>
                        <Text style={styles.energyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.removePokemonBtn} onPress={onRemove}>
              <Text style={styles.removePokemonText}>🗑️ Quitar de la zona</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Modal: expanded zone view (hand/discard/prizes/deck) ──────────────────────

function ZoneCardsModal({
  visible,
  title,
  cards,
  deckCards,
  isPrizes,
  onAddFromDeck,
  onRemoveFromZone,
  onClose,
}: {
  visible: boolean;
  title: string;
  cards: unknown[];
  deckCards: unknown[];
  isPrizes: boolean;
  onAddFromDeck: (deckIndex: number) => void;
  onRemoveFromZone: (zoneIndex: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ZoneTab>('all');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (visible) {
      setTab('all');
      setFilter('');
    }
  }, [visible]);

  const filteredAvailable = (() => {
    let list = deckCards;
    if (tab === 'pokemon') list = list.filter(c => classifyCard(c) === 'pokemon');
    if (tab === 'trainer') list = list.filter(c => classifyCard(c) === 'trainer');
    if (tab === 'energy') list = list.filter(c => classifyCard(c) === 'energy');
    const q = filter.trim().toLowerCase();
    if (q) list = list.filter(c => String((c as { name?: string }).name ?? '').toLowerCase().includes(q));
    return list;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.zoneOverlay}>
        <View style={styles.zoneModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.zoneCount}>
              {cards.length} cartas{isPrizes ? ` / ${MAX_PRIZES}` : ''}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.zoneTabs}>
            {(
              [
                ['all', 'Todo'],
                ['pokemon', 'Pokémon'],
                ['trainer', 'Entrenadores'],
                ['energy', 'Energías'],
              ] as [ZoneTab, string][]
            ).map(([k, label]) => (
              <Pressable
                key={k}
                style={[styles.zoneTab, tab === k && styles.zoneTabActive]}
                onPress={() => setTab(k)}
              >
                <Text style={[styles.zoneTabText, tab === k && styles.zoneTabTextActive]}>{label}</Text>
              </Pressable>
            ))}
            <TextInput
              style={styles.zoneFilter}
              placeholder="Buscar..."
              placeholderTextColor="#9FB2C8"
              value={filter}
              onChangeText={setFilter}
            />
          </View>
          <ScrollView style={styles.zoneBody}>
            <Text style={styles.zoneGroupTitle}>
              En {title} ({cards.length})
            </Text>
            {cards.length === 0 ? (
              <Text style={styles.emptyText}>Vacío</Text>
            ) : (
              cards.map((c, i) => (
                <View key={i} style={styles.zoneCardRow}>
                  <Text style={styles.zoneCardName} numberOfLines={1}>
                    {String((c as { name?: string }).name ?? '?')}
                  </Text>
                  <Text style={styles.zoneCardInfo}>{zoneLabel(c)}</Text>
                  <Pressable onPress={() => onRemoveFromZone(i)} hitSlop={8}>
                    <Text style={styles.zoneRemove}>✕</Text>
                  </Pressable>
                </View>
              ))
            )}
            <Text style={styles.zoneGroupTitle}>📚 Del deck ({filteredAvailable.length} disponibles)</Text>
            {isPrizes && cards.length >= MAX_PRIZES ? (
              <Text style={styles.emptyText}>Máximo {MAX_PRIZES} premios</Text>
            ) : filteredAvailable.length === 0 ? (
              <Text style={styles.emptyText}>{filter ? 'Sin resultados' : 'No hay cartas en el deck'}</Text>
            ) : (
              filteredAvailable.map((c, i) => {
                const realIndex = deckCards.indexOf(c);
                return (
                  <Pressable
                    key={i}
                    style={styles.zoneCardRow}
                    onPress={() => onAddFromDeck(realIndex >= 0 ? realIndex : i)}
                  >
                    <Text style={styles.zoneCardName} numberOfLines={1}>
                      {String((c as { name?: string }).name ?? '?')}
                    </Text>
                    <Text style={styles.zoneCardInfo}>{zoneLabel(c)}</Text>
                    <Text style={styles.zoneAdd}>+</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── GameBoard ─────────────────────────────────────────────────────────────────

export function GameBoard() {
  const { store } = useStorage();
  const gameState = store(s => s.gameState);
  const player1Deck = store(s => s.player1Deck);
  const player2Deck = store(s => s.player2Deck);
  const placePokemonFromDeck = store(s => s.placePokemonFromDeck);
  const clearActivePokemon = store(s => s.clearActivePokemon);
  const clearBenchPokemon = store(s => s.clearBenchPokemon);
  const updatePokemonHp = store(s => s.updatePokemonHp);
  const addDamage = store(s => s.addDamage);
  const addEnergy = store(s => s.addEnergy);
  const removeEnergy = store(s => s.removeEnergy);
  const setStatus = store(s => s.setStatus);
  const setHand = store(s => s.setHand);
  const setDiscard = store(s => s.setDiscard);
  const setPrizes = store(s => s.setPrizes);
  const setDeck = store(s => s.setDeck);
  const swapPlayers = store(s => s.swapPlayers);
  const resetGame = store(s => s.resetGame);

  const [pickerSlot, setPickerSlot] = useState<{ side: Side; type: 'active' | 'bench'; index?: number } | null>(null);
  const [editing, setEditing] = useState<{ side: Side; id: string } | null>(null);
  const [openZone, setOpenZone] = useState<{ side: Side; zone: ZoneKey } | null>(null);

  const sideState = (s: Side): PlayerState => (s === 'player1' ? gameState.player1 : gameState.player2);
  const sideLabel = (s: Side): string => (s === 'player1' ? 'TÚ' : 'RIVAL');
  const sideDeckPreset = (s: Side): DeckPreset | null => (s === 'player1' ? player1Deck : player2Deck);

  const zoneCards = (s: Side, zone: ZoneKey): any[] => {
    const st = sideState(s);
    if (zone === 'deck') return st.deck;
    if (zone === 'hand') return st.hand;
    if (zone === 'discard') return st.discardPile;
    return st.prizes;
  };

  const handlePlace = (cardIndex: number) => {
    if (!pickerSlot) return;
    placePokemonFromDeck(pickerSlot.side, pickerSlot.type === 'active' ? -1 : pickerSlot.index!, cardIndex);
    setPickerSlot(null);
  };

  const handleAddFromDeck = (s: Side, zone: ZoneKey, deckIndex: number) => {
    const st = sideState(s);
    const cards = zoneCards(s, zone);
    if (zone === 'prizes' && cards.length >= MAX_PRIZES) return;
    const card = { ...st.deck[deckIndex], id: uuidv4() };
    const newDeck = [...st.deck];
    newDeck.splice(deckIndex, 1);
    setDeck(s, newDeck);
    const setter = zone === 'hand' ? setHand : zone === 'discard' ? setDiscard : setPrizes;
    setter(s, [...cards, card]);
  };

  const handleRemoveFromZone = (s: Side, zone: ZoneKey, zoneIndex: number) => {
    const st = sideState(s);
    const cards = zoneCards(s, zone);
    const card = cards[zoneIndex];
    const newZone = cards.filter((_, i) => i !== zoneIndex);
    const setter = zone === 'hand' ? setHand : zone === 'discard' ? setDiscard : setPrizes;
    setter(s, newZone);
    setDeck(s, [...st.deck, { ...card, id: uuidv4() }]);
  };

  const handleRemovePokemon = (s: Side, id: string) => {
    const st = sideState(s);
    if (st.active?.id === id) clearActivePokemon(s);
    else {
      const idx = st.bench.findIndex(b => b?.id === id);
      if (idx >= 0) clearBenchPokemon(s, idx);
    }
    setEditing(null);
  };

  const handleReset = () => {
    Alert.alert('Salir', '¿Salir del escenario actual? Si no lo guardaste, se pierde.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => resetGame() },
    ]);
  };

  const editingPokemon = editing ? findPokemonInstance(sideState(editing.side), editing.id) : null;

  const renderSideSlots = (s: Side) => {
    const st = sideState(s);
    const onSlotPress = (type: 'active' | 'bench', index?: number) => setPickerSlot({ side: s, type, index });
    const onPokemonPress = (id: string) => setEditing(editing?.side === s && editing.id === id ? null : { side: s, id });

    const renderActive = () => (
      <View style={styles.activeArea}>
        {st.active ? (
          <PokemonCardView
            pokemon={st.active}
            showDetails
            selected={editing?.side === s && editing.id === st.active.id}
            onPress={() => onPokemonPress(st.active!.id)}
          />
        ) : (
          <Pressable style={[styles.slot, styles.emptySlot]} onPress={() => onSlotPress('active')}>
            <Text style={styles.slotLabel}>ACTIVO</Text>
            <Text style={styles.slotPlus}>+</Text>
          </Pressable>
        )}
      </View>
    );

    const renderBench = () => (
      <View style={styles.benchArea}>
        <Text style={styles.benchLabel}>Banca</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.benchRow}>
          {[0, 1, 2, 3, 4].map(i => {
            const pokemon = st.bench[i] ?? null;
            return pokemon ? (
              <PokemonCardView
                key={pokemon.id}
                pokemon={pokemon}
                selected={editing?.side === s && editing.id === pokemon.id}
                onPress={() => onPokemonPress(pokemon.id)}
              />
            ) : (
              <Pressable key={i} style={[styles.slot, styles.emptySlot, styles.benchSlot]} onPress={() => onSlotPress('bench', i)}>
                <Text style={styles.slotPlus}>+</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );

    const renderZones = () => (
      <View style={styles.zonesRow}>
        {(['prizes', 'deck', 'hand', 'discard'] as ZoneKey[]).map(zone => (
          <Pressable key={zone} style={styles.zoneChip} onPress={() => setOpenZone({ side: s, zone })}>
            <Text style={styles.zoneChipTitle}>{ZONE_TITLES[zone]}</Text>
            <Text style={styles.zoneChipCount}>
              {zone === 'prizes' ? `${st.prizes.length}/${MAX_PRIZES}` : zoneCards(s, zone).length}
            </Text>
          </Pressable>
        ))}
      </View>
    );


    return (
      <View style={styles.side}>
        <View style={styles.sideLabelRow}>
          <Text style={styles.sideLabel}>{sideLabel(s)}</Text>
          <Text style={styles.sideDetails}>
            {gameState.currentPlayer === s ? '▶️ tu turno' : '⏸'} — turno {gameState.turn}
          </Text>
        </View>

        {s === 'player2' ? (
          <>
            {renderZones()}
            {renderBench()}
            {renderActive()}
          </>
        ) : (
          <>
            {renderActive()}
            {renderBench()}
            {renderZones()}
          </>
        )}
      </View>
    );
  };

  const pickerGroups = pickerSlot ? groupPokemonByCard(pokemonInDeck(sideState(pickerSlot.side).deck)) : [];

  return (
    <View style={styles.board}>
      <View style={styles.boardActions}>
        <Pressable style={styles.boardActionBtn} onPress={swapPlayers}>
          <Text style={styles.boardActionText}>⇅ Cambiar lados</Text>
        </Pressable>
        <Pressable style={styles.boardActionBtn} onPress={handleReset}>
          <Text style={styles.boardActionText}>🚪 Salir</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.boardScroll}>
        {renderSideSlots('player2')}
        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>⚔️</Text>
        </View>
        {renderSideSlots('player1')}
      </ScrollView>

      <PokemonPickerModal
        visible={pickerSlot !== null}
        label={pickerSlot ? sideLabel(pickerSlot.side) : ''}
        groups={pickerGroups}
        onSelect={handlePlace}
        onClose={() => setPickerSlot(null)}
      />

      {editing && editingPokemon && (
        <EditPokemonSheet
          visible
          pokemon={editingPokemon}
          deckPreset={sideDeckPreset(editing.side)}
          discardPile={sideState(editing.side).discardPile}
          attachedCounts={computeAttachedCounts(sideState(editing.side))}
          onHp={hp => updatePokemonHp(editing.side, editing.id, hp)}
          onAddDamage={delta => addDamage(editing.side, editing.id, delta)}
          onAddEnergy={key => addEnergy(editing.side, editing.id, key)}
          onRemoveEnergy={key => removeEnergy(editing.side, editing.id, key)}
          onSetStatus={status => setStatus(editing.side, editing.id, status)}
          onRemove={() => handleRemovePokemon(editing.side, editing.id)}
          onClose={() => setEditing(null)}
        />
      )}

      {openZone && (
        <ZoneCardsModal
          visible
          title={`${ZONE_TITLES[openZone.zone]} — ${sideLabel(openZone.side)}`}
          cards={zoneCards(openZone.side, openZone.zone)}
          deckCards={zoneCards(openZone.side, 'deck')}
          isPrizes={openZone.zone === 'prizes'}
          onAddFromDeck={deckIndex => handleAddFromDeck(openZone.side, openZone.zone, deckIndex)}
          onRemoveFromZone={zoneIndex => handleRemoveFromZone(openZone.side, openZone.zone, zoneIndex)}
          onClose={() => setOpenZone(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  boardScroll: {
    padding: 12,
    paddingBottom: 32,
    gap: 10,
  },
  boardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  boardActionBtn: {
    backgroundColor: '#16213A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: '#2A3B5C',
    borderWidth: 1,
  },
  boardActionText: {
    color: '#F5F9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  side: {
    gap: 8,
  },
  sideLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideLabel: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sideDetails: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  activeArea: {
    alignItems: 'center',
  },
  benchArea: {
    gap: 4,
  },
  benchLabel: {
    color: '#9FB2C8',
    fontSize: 11,
    fontWeight: '600',
  },
  benchRow: {
    gap: 8,
    alignItems: 'flex-start',
  },
  zonesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  zoneChip: {
    flex: 1,
    backgroundColor: '#16213A',
    borderRadius: 10,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  zoneChipTitle: {
    color: '#C9D6EA',
    fontSize: 11,
    fontWeight: '600',
  },
  zoneChipCount: {
    color: '#F5F9FF',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  slot: {
    backgroundColor: '#16213A',
    borderColor: '#2A3B5C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minWidth: 108,
    minHeight: 60,
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  benchSlot: {
    minHeight: 56,
  },
  slotLabel: {
    color: '#9FB2C8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  slotPlus: {
    color: '#208AEF',
    fontSize: 22,
    fontWeight: '700',
  },
  vsDivider: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  vsText: {
    fontSize: 18,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#16213A',
    borderRadius: 14,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 14,
    maxHeight: '70%',
  },
  sheet: {
    backgroundColor: '#16213A',
    borderRadius: 16,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 14,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  modalTitle: {
    color: '#F5F9FF',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  modalClose: {
    color: '#9FB2C8',
    fontSize: 16,
    fontWeight: '700',
  },
  pickerList: {
    maxHeight: 420,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomColor: '#2A3B5C',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  pickerName: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerInfo: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  pickerCount: {
    color: '#208AEF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#9FB2C8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  editRow: {
    marginBottom: 12,
    gap: 6,
  },
  editLabel: {
    color: '#C9D6EA',
    fontSize: 12,
    fontWeight: '700',
  },
  hpControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hpBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  hpBtnText: {
    color: '#0B1220',
    fontSize: 13,
    fontWeight: '800',
  },
  hpValue: {
    color: '#F5F9FF',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    backgroundColor: '#0B1220',
    borderColor: '#2A3B5C',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  statusChipText: {
    color: '#C9D6EA',
    fontSize: 11,
  },
  statusChipTextActive: {
    color: '#0B1220',
    fontWeight: '800',
  },
  energyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  energyCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  energyBtn: {
    backgroundColor: '#0B1220',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderColor: '#2A3B5C',
    borderWidth: 1,
  },
  energyBtnText: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '700',
  },
  energyCountBadge: {
    borderRadius: 10,
    minWidth: 34,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 4,
  },
  energyCountIcon: {
    fontSize: 11,
  },
  energyCountNumber: {
    color: '#0B1220',
    fontSize: 11,
    fontWeight: '800',
  },
  specialEnergyLabel: {
    color: '#0B1220',
    fontSize: 8,
    fontWeight: '800',
    maxWidth: 40,
  },
  removePokemonBtn: {
    backgroundColor: '#3A1620',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  removePokemonText: {
    color: '#FF7B80',
    fontSize: 13,
    fontWeight: '700',
  },
  zoneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  zoneModal: {
    backgroundColor: '#16213A',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    maxHeight: '85%',
    minHeight: '60%',
  },
  zoneCount: {
    color: '#9FB2C8',
    fontSize: 12,
  },
  zoneTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  zoneTab: {
    backgroundColor: '#0B1220',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  zoneTabActive: {
    backgroundColor: '#208AEF',
  },
  zoneTabText: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  zoneTabTextActive: {
    color: '#0B1220',
    fontWeight: '800',
  },
  zoneFilter: {
    backgroundColor: '#0B1220',
    borderRadius: 8,
    color: '#F5F9FF',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 110,
    flex: 1,
    minHeight: 30,
  },
  zoneBody: {
    flexGrow: 1,
  },
  zoneGroupTitle: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  zoneCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomColor: '#2A3B5C',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  zoneCardName: {
    color: '#F5F9FF',
    fontSize: 12,
    flex: 1,
  },
  zoneCardInfo: {
    color: '#9FB2C8',
    fontSize: 10,
  },
  zoneRemove: {
    color: '#FF7B80',
    fontSize: 14,
    fontWeight: '700',
  },
  zoneAdd: {
    color: '#4CC38A',
    fontSize: 16,
    fontWeight: '800',
  },
});