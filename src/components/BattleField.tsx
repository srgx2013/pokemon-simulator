import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PokemonCard } from './PokemonCard';
import { parseDeckListWithApi } from '../data/decks';
import { v4 as uuidv4 } from 'uuid';
import { energyColors } from '../data/decks';
import type { PokemonInstance, StatusCondition } from '../types';

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

export function BattleField({ player }: { player: 'player1' | 'player2' }) {
  const gameState = useGameStore(state => state.gameState);
  const placePokemonFromDeck = useGameStore(state => state.placePokemonFromDeck);
  const clearBenchPokemon = useGameStore(state => state.clearBenchPokemon);
  const clearActivePokemon = useGameStore(state => state.clearActivePokemon);
  const updatePokemonHp = useGameStore(state => state.updatePokemonHp);
  const addEnergy = useGameStore(state => state.addEnergy);
  const removeEnergy = useGameStore(state => state.removeEnergy);
  const setStatus = useGameStore(state => state.setStatus);
  const setHand = useGameStore(state => state.setHand);
  const setDiscard = useGameStore(state => state.setDiscard);
  const setPrizes = useGameStore(state => state.setPrizes);
  const setDeck = useGameStore(state => state.setDeck);
  const p1Deck = useGameStore(state => state.player1Deck);
  const p2Deck = useGameStore(state => state.player2Deck);

  const [expandedZone, setExpandedZone] = useState<{ player: 'player1' | 'player2'; zone: 'deck' | 'hand' | 'discard' | 'prizes' } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pickerSlot, setPickerSlot] = useState<{ side: 'player1' | 'player2'; type: 'active' | 'bench'; index?: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<{ player: 'player1' | 'player2'; id: string } | null>(null);
  const [zoneFilter, setZoneFilter] = useState('');
  const [zoneTab, setZoneTab] = useState<'all' | 'pokemon' | 'trainer' | 'energy'>('all');

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerSlot(null); };
    if (pickerSlot) setTimeout(() => document.addEventListener('click', fn), 0);
    return () => document.removeEventListener('click', fn);
  }, [pickerSlot]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (overlayRef.current && e.target === overlayRef.current) setExpandedZone(null); };
    if (expandedZone) document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, [expandedZone]);

  const sideState = (s: 'player1' | 'player2') => s === 'player1' ? gameState.player1 : gameState.player2;

  // ── Picker for Pokémon ──
  const getAvailablePokemon = (s: 'player1' | 'player2') =>
    sideState(s).deck.map((c, i) => ({ card: c, index: i })).filter(({ card }) => 'hp' in card && (card as any).stage);

  const handlePlace = (cardIndex: number) => {
    if (!pickerSlot) return;
    placePokemonFromDeck(pickerSlot.side, pickerSlot.type === 'active' ? -1 : pickerSlot.index!, cardIndex);
    setPickerSlot(null);
  };

  // ── Edit panel ──
  const renderEditPanel = (s: 'player1' | 'player2', pokeId: string) => {
    const st = sideState(s);
    const pokemon = st.active?.id === pokeId ? st.active : st.bench.find(b => b?.id === pokeId);
    if (!pokemon) return null;

    const deckPreset = s === 'player1' ? p1Deck : p2Deck;
    const deckEnergyTypes: string[] = deckPreset?.energies?.map((e: any) => e.type) || [];
    const specials: any[] = deckPreset?.energies?.filter((e: any) => e.name && e.type === 'special') || [];

    // Energy limits: keyed by type for basics, by name for specials
    const energyLimits: Record<string, number> = {};
    deckPreset?.energies?.forEach((e: any) => {
      const key = e.name || e.type;
      energyLimits[key] = (energyLimits[key] || 0) + e.quantity;
    });
    // Subtract discard
    (st.discardPile as any[]).forEach((c: any) => {
      const et = c.energyType || (c.type !== 'energy' ? null : c.type);
      if (et && energyLimits[et] !== undefined) energyLimits[et] = Math.max(0, energyLimits[et] - 1);
      if (c.name && energyLimits[c.name] !== undefined) energyLimits[c.name] = Math.max(0, energyLimits[c.name] - 1);
    });

    // Total attached across all Pokemon on this side
    const totalAtt: Record<string, number> = {};
    const count = (e: string) => { totalAtt[e] = (totalAtt[e] || 0) + 1; };
    if (st.active) st.active.attachedEnergy.forEach(count);
    st.bench.forEach(p => { if (p) p.attachedEnergy.forEach(count); });

    const atLimit = (t: string): boolean => {
      const lim = energyLimits[t];
      if (lim === undefined || lim === 0) return false;
      return (totalAtt[t] || 0) >= lim;
    };

    return (
      <div className="edit-panel" onClick={e => e.stopPropagation()}>
        <div className="edit-field">
          <label>HP</label>
          <div className="hp-controls">
            <button className="hp-btn" onClick={() => updatePokemonHp(s, pokeId, pokemon.currentHp - 10)}>-10</button>
            <span className="hp-value">{pokemon.currentHp}</span>
            <button className="hp-btn" onClick={() => updatePokemonHp(s, pokeId, pokemon.currentHp + 10)}>+10</button>
          </div>
        </div>
        <div className="edit-field">
          <label>Estado</label>
          <select value={pokemon.status} onChange={e => setStatus(s, pokeId, e.target.value as StatusCondition)}>
            <option value="none">Ninguno</option>
            <option value="poisoned">Envenenado</option>
            <option value="poisoned1">+1</option>
            <option value="poisoned2">+2</option>
            <option value="poisoned3">+3</option>
            <option value="paralyzed">Paralizado</option>
            <option value="asleep">Dormido</option>
            <option value="confused">Confuso</option>
          </select>
        </div>
        <div className="edit-field">
          <label>Energía ({pokemon.attachedEnergy.length})</label>
          {/* Basic energies */}
          <div className="energy-controls-grid">
            {BASIC_ENERGY.filter(e => deckEnergyTypes.length === 0 || deckEnergyTypes.includes(e.t)).map(({ t, icon }) => {
              const count = pokemon.attachedEnergy.filter(e => e === t).length;
              return (
                <div key={t} className="energy-counter">
                  <button className="energy-btn-minus" onClick={() => removeEnergy(s, pokeId, t)} disabled={count === 0}>−</button>
                  <div className="energy-count-badge" style={{ backgroundColor: count > 0 ? energyColors[t] : '#333' }}>
                    <span className="energy-badge-icon">{icon}</span>
                    <span className="energy-badge-count">{count}</span>
                  </div>
                  <button className="energy-btn-plus" onClick={() => addEnergy(s, pokeId, t)} disabled={atLimit(t)}>+</button>
                </div>
              );
            })}
          </div>
          {/* Special energies */}
          {specials.length > 0 && (
            <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
              <div className="energy-controls-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {specials.map((sp: any) => {
                  const c = pokemon.attachedEnergy.filter((x: string) => x === sp.name).length;
                  const limit = energyLimits[sp.name] || 0;
                  const used = totalAtt[sp.name] || 0;
                  return (
                    <div key={sp.name} className="energy-counter">
                      <button className="energy-btn-minus" onClick={() => removeEnergy(s, pokeId, sp.name)} disabled={c === 0}>−</button>
                      <div className="energy-count-badge" style={{ backgroundColor: c > 0 ? '#9B7DFF' : '#333' }} title={sp.name}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{sp.name.replace(' Energy', '').slice(0, 8)}</span>
                        <span className="energy-badge-count">{c}</span>
                      </div>
                      <button className="energy-btn-plus" onClick={() => addEnergy(s, pokeId, sp.name)} disabled={limit > 0 && used >= limit}>+</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button className="close-edit" onClick={() => setEditingId(null)}>✕</button>
      </div>
    );
  };

  // ── Picker dropdown ──
  const renderPicker = () => {
    if (!pickerSlot) return null;
    const available = getAvailablePokemon(pickerSlot.side);
    const groups: Record<string, { name: string; stage: string; hp: number; count: number; firstIndex: number }> = {};
    available.forEach(({ card, index }) => {
      const c = card as any;
      if (!groups[c.name]) groups[c.name] = { name: c.name, stage: c.stage, hp: c.hp, count: 0, firstIndex: index };
      groups[c.name].count++;
    });
    const grouped = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="picker-dropdown" ref={pickerRef}>
        <div className="picker-header">
          <span>Pokémon ({available.length} cartas, {grouped.length} tipos)</span>
          <button className="picker-close" onClick={() => setPickerSlot(null)}>✕</button>
        </div>
        <div className="picker-list">
          {grouped.length === 0 ? (
            <div className="picker-empty">No hay Pokémon en el deck</div>
          ) : (
            grouped.map(g => (
              <div key={g.name} className="picker-item" onClick={() => handlePlace(g.firstIndex)}>
                <div className="picker-item-left">
                  <span className="picker-item-name">{g.name}</span>
                  <span className="picker-item-info">{g.stage} • {g.hp}HP</span>
                </div>
                <span className="picker-item-count">×{g.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ── Interactive expanded zone ──
  const renderExpandedZone = () => {
    if (!expandedZone) return null;
    const { player: p, zone } = expandedZone;
    const st = sideState(p);
    const cards = zone === 'deck' ? st.deck : zone === 'hand' ? st.hand : zone === 'discard' ? st.discardPile : st.prizes;
    const labels: Record<string, string> = { deck: '📚 Deck', hand: '🃏 Mano', discard: '🗑️ Descarte', prizes: '🏆 Premios' };
    const maxPrizes = 6;
    const isPrizes = zone === 'prizes';
    const availableDeckCards = zone === 'deck' ? [] : st.deck;

    const filteredAvailable = zoneTab === 'all' ? availableDeckCards
      : zoneTab === 'pokemon' ? availableDeckCards.filter((c: any) => 'hp' in c && (c as any).stage)
      : zoneTab === 'trainer' ? availableDeckCards.filter((c: any) => !('hp' in c) && !('energyType' in c))
      : availableDeckCards.filter((c: any) => 'energyType' in c);

    const searchedAvailable = zoneFilter
      ? filteredAvailable.filter((c: any) => c.name?.toLowerCase().includes(zoneFilter.toLowerCase()))
      : filteredAvailable;

    const handleAddFromDeck = (deckIndex: number) => {
      if (isPrizes && cards.length >= maxPrizes) return;
      const card = { ...st.deck[deckIndex], id: uuidv4() };
      const newDeck = [...st.deck];
      newDeck.splice(deckIndex, 1);
      setDeck(p, newDeck);
      const setter = zone === 'hand' ? setHand : zone === 'discard' ? setDiscard : setPrizes;
      setter(p, [...cards, card]);
    };

    const handleRemoveFromZone = (zoneIndex: number) => {
      const card = cards[zoneIndex];
      const newZone = cards.filter((_: any, i: number) => i !== zoneIndex);
      const setter = zone === 'hand' ? setHand : zone === 'discard' ? setDiscard : setPrizes;
      setter(p, newZone);
      setDeck(p, [...st.deck, { ...card, id: uuidv4() }]);
    };

    const catLabel = (c: any) => {
      if ('hp' in c && (c as any).stage) return 'Pokémon';
      if ('energyType' in c) return 'Energía';
      return 'Entrenador';
    };

    return (
      <div className="expanded-overlay" ref={overlayRef}>
        <div className="expanded-panel wide">
          <div className="expanded-panel-header">
            <span>{labels[zone]} — {p === 'player1' ? 'Tú' : 'Rival'}</span>
            <span className="expanded-count">{cards.length} cartas {isPrizes ? `/ ${maxPrizes}` : ''}</span>
            <button className="close-btn" onClick={() => setExpandedZone(null)}>✕</button>
          </div>
          <div className="expanded-panel-tabs">
            {(['all', 'pokemon', 'trainer', 'energy'] as const).map(tab => (
              <button key={tab} className={zoneTab === tab ? 'active' : ''} onClick={() => setZoneTab(tab)}>
                {tab === 'all' ? 'Todo' : tab === 'pokemon' ? 'Pokémon' : tab === 'trainer' ? 'Entrenadores' : 'Energías'}
              </button>
            ))}
            <input className="zone-filter-input" type="text" placeholder="Buscar..." value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} />
          </div>
          <div className="expanded-panel-body">
            <div className="expanded-group">
              <h5>En {labels[zone]} ({cards.length})</h5>
              {cards.length === 0 ? <div className="expanded-empty">Vacío</div> : (
                <div className="expanded-list">
                  {cards.map((c: any, i: number) => (
                    <div key={i} className="expanded-card-item removable">
                      <span className="expanded-card-name">{c.name}</span>
                      <span className="expanded-card-info">{catLabel(c)}</span>
                      <button className="expanded-remove-btn" onClick={() => handleRemoveFromZone(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {zone !== 'deck' && (
              <div className="expanded-group">
                <h5>📚 Del deck ({searchedAvailable.length} disponibles)</h5>
                {isPrizes && cards.length >= maxPrizes ? (
                  <div className="expanded-empty">Máximo {maxPrizes} premios</div>
                ) : searchedAvailable.length === 0 ? (
                  <div className="expanded-empty">{zoneFilter ? 'Sin resultados' : 'No hay cartas en el deck'}</div>
                ) : (
                  <div className="expanded-list">
                    {searchedAvailable.map((c: any, i: number) => {
                      const realIndex = st.deck.indexOf(c);
                      return (
                        <div key={i} className="expanded-card-item addable" onClick={() => handleAddFromDeck(realIndex >= 0 ? realIndex : i)}>
                          <span className="expanded-card-name">{c.name}</span>
                          <span className="expanded-card-info">{catLabel(c)}</span>
                          <span className="expanded-add-icon">+</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render side ──
  const renderSide = (s: 'player1' | 'player2', isOpponent: boolean) => {
    const st = sideState(s);
    const label = s === 'player1' ? 'TÚ' : 'RIVAL';
    const onSlotClick = (type: 'active' | 'bench', index?: number) => setPickerSlot({ side: s, type, index });
    const onPokemonClick = (id: string) => setEditingId(editingId?.player === s && editingId?.id === id ? null : { player: s, id });

    const pokemonCard = (pokemon: PokemonInstance) => (
      <div style={{ position: 'relative' }}>
        <PokemonCard pokemon={pokemon} showDetails selected={editingId?.player === s && editingId?.id === pokemon.id} onClick={() => onPokemonClick(pokemon.id)} />
        <button className="slot-remove-btn" onClick={() => {
          if (st.active?.id === pokemon.id) clearActivePokemon(s);
          else { const idx = st.bench.findIndex(b => b?.id === pokemon.id); if (idx >= 0) clearBenchPokemon(s, idx); }
        }}>✕</button>
        {editingId?.player === s && editingId?.id === pokemon.id && renderEditPanel(s, pokemon.id)}
      </div>
    );

    const zoneClick = (zone: 'prizes' | 'deck' | 'discard') => { setExpandedZone({ player: s, zone }); setZoneFilter(''); setZoneTab('all'); };

    const prizes = (
      <div className="zone prizes-zone" onClick={() => zoneClick('prizes')}>
        <div className="zone-title">🏆 Premios</div>
        <div className="prizes-grid">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`prize-cell ${st.prizes[i] ? 'filled' : 'empty'}`}>{st.prizes[i] ? '★' : '·'}</div>
          ))}
        </div>
        <div className="zone-count">{st.prizes.length}/6</div>
      </div>
    );

    const deckDiscard = (swapOrder: boolean = false) => {
      const first = swapOrder ? 'discard' : 'deck';
      const second = swapOrder ? 'deck' : 'discard';
      const info = { deck: { title: '📚 Deck', len: st.deck.length }, discard: { title: '🗑️ Descarte', len: st.discardPile.length } };
      return (
        <>
          <div className={`zone ${first}-zone`} onClick={() => zoneClick(first as 'deck' | 'discard')}>
            <div className="zone-title">{info[first as keyof typeof info].title}</div>
            <div className="zone-count big">{info[first as keyof typeof info].len}</div>
          </div>
          <div className={`zone ${second}-zone`} onClick={() => zoneClick(second as 'deck' | 'discard')}>
            <div className="zone-title">{info[second as keyof typeof info].title}</div>
            <div className="zone-count big">{info[second as keyof typeof info].len}</div>
          </div>
        </>
      );
    };

    const active = (
      <div className="active-area">
        {st.active ? pokemonCard(st.active) : (
          <div className="playmat-slot empty active-slot" onClick={() => onSlotClick('active')}>
            <div className="slot-label">ACTIVO</div>
            <div className="slot-plus">+</div>
          </div>
        )}
      </div>
    );

    const bench = (
      <div className="bench-area">
        <div className="bench-label">Banca</div>
        <div className="bench-row">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="bench-slot-wrapper">
              {st.bench[i] ? pokemonCard(st.bench[i]!) : (
                <div className="playmat-slot empty bench-slot" onClick={() => onSlotClick('bench', i)}>
                  <div className="slot-plus">+</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className={`playmat-side ${isOpponent ? 'opponent' : 'player'}`}>
        <div className="side-label">{label}</div>
        <div className="playmat-layout">
          {isOpponent ? (
            <><div className="playmat-left">{deckDiscard(true)}</div><div className="playmat-center">{bench}{active}</div><div className="playmat-right">{prizes}</div></>
          ) : (
            <><div className="playmat-left">{prizes}</div><div className="playmat-center">{active}{bench}</div><div className="playmat-right">{deckDiscard()}</div></>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="playmat">
        {renderSide('player2', true)}
        <div className="vs-divider"><span className="vs-text">⚔️</span></div>
        {renderSide(player, false)}
      </div>
      {renderPicker()}
      {renderExpandedZone()}
    </>
  );
}

export function DeckSelector() {
  const [showDeck, setShowDeck] = useState(false);
  const [importTextP1, setImportTextP1] = useState('');
  const [importTextP2, setImportTextP2] = useState('');
  const customDecks = useGameStore(state => state.customDecks);
  const loadCustomDecks = useGameStore(state => state.loadCustomDecks);
  const addCustomDeck = useGameStore(state => state.addCustomDeck);
  const player1Deck = useGameStore(state => state.player1Deck);
  const player2Deck = useGameStore(state => state.player2Deck);
  const setPlayer1Deck = useGameStore(state => state.setPlayer1Deck);
  const setPlayer2Deck = useGameStore(state => state.setPlayer2Deck);
  const startGame = useGameStore(state => state.startGame);

  const handleOpenDeckModal = () => { loadCustomDecks(); setShowDeck(true); };
  const handleStartGame = () => { if (player1Deck && player2Deck) { startGame(); setShowDeck(false); } };
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; cardName: string } | null>(null);

  const handleImport = async (targetPlayer: 'player1' | 'player2') => {
    const text = targetPlayer === 'player1' ? importTextP1 : importTextP2;
    if (!text.trim()) return;
    try {
      const deckName = prompt(`Nombre del mazo para ${targetPlayer === 'player1' ? 'P1' : 'P2'}:`) || 'Mazo';
      setImportProgress({ current: 0, total: 1, cardName: 'Iniciando...' });
      const { pokemon, trainers, energies } = await parseDeckListWithApi(text, (cur, tot, n) => setImportProgress({ current: cur, total: tot, cardName: n }));
      setImportProgress(null);
      if (pokemon.length > 0 || trainers.length > 0 || energies.length > 0) {
        const newDeck = { id: uuidv4(), name: deckName, description: 'Importado', pokemon, trainers, energies };
        if (targetPlayer === 'player1') { setPlayer1Deck(newDeck); setImportTextP1(''); }
        else { setPlayer2Deck(newDeck); setImportTextP2(''); }
        addCustomDeck(newDeck);
      }
    } catch { setImportProgress(null); alert('Error al importar.'); }
  };

  return (
    <div className="deck-selector">
      <button className="select-deck-btn" onClick={handleOpenDeckModal}>🎴 Nueva Partida</button>
      {showDeck && (
        <div className="deck-modal"><div className="modal-content deck-modal-wide">
          <h3>Seleccionar Mazos</h3>
          <div className="import-section">
            <label>🎯 Importar P1:</label>
            <textarea value={importTextP1} onChange={e => setImportTextP1(e.target.value)} rows={3} />
            <button onClick={() => handleImport('player1')} className="import-btn" disabled={!importTextP1.trim() || importProgress !== null}>Importar P1</button>
          </div>
          <div className="import-section">
            <label>⚔️ Importar P2:</label>
            <textarea value={importTextP2} onChange={e => setImportTextP2(e.target.value)} rows={3} />
            <button onClick={() => handleImport('player2')} className="import-btn" disabled={!importTextP2.trim() || importProgress !== null}>Importar P2</button>
          </div>
          {importProgress && (<div className="import-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} /></div><p className="progress-text">🔄 {importProgress.cardName}</p></div>)}
          <div className="deck-selection-grid">
            <div className="deck-player-section">
              <h4>🎯 Mazo P1</h4>
              {player1Deck ? (<div className="selected-deck"><span>{player1Deck.name}</span><button onClick={() => setPlayer1Deck(null)}>Cambiar</button></div>) : (
                <><p className="no-deck-message">No hay mazo</p><div className="deck-list">{customDecks.map(d => <button key={d.id} className="deck-option" onClick={() => setPlayer1Deck(d)}>{d.name}</button>)}</div></>
              )}
            </div>
            <div className="deck-player-section">
              <h4>⚔️ Mazo P2</h4>
              {player2Deck ? (<div className="selected-deck"><span>{player2Deck.name}</span><button onClick={() => setPlayer2Deck(null)}>Cambiar</button></div>) : (
                <><p className="no-deck-message">No hay mazo</p><div className="deck-list">{customDecks.map(d => <button key={d.id} className="deck-option" onClick={() => setPlayer2Deck(d)}>{d.name}</button>)}</div></>
              )}
            </div>
          </div>
          <button className="start-game-btn" onClick={handleStartGame} disabled={!player1Deck || !player2Deck}>Iniciar Partida</button>
          <button className="close-btn" onClick={() => setShowDeck(false)}>✕</button>
        </div></div>
      )}
    </div>
  );
}
