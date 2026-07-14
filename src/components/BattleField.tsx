import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { energyTypes, energyColors } from '../data/decks';
import { parseDeckListWithApi } from '../data/decks';
import { PokemonCard } from './PokemonCard';
import { v4 as uuidv4 } from 'uuid';
import type { PokemonInstance, PokemonCard as PokemonCardType, EnergyType, StatusCondition, DeckPreset } from '../types';

interface Props {
  player: 'player1' | 'player2';
  isCurrentPlayer?: boolean;
}

export function BattleField({ player, isCurrentPlayer = false }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEnemy, setEditingEnemy] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCardType | null>(null);
  // Note: showOpponentHand moved to App.tsx for better layout
  
  const gameState = useGameStore(state => state.gameState);
  const setActivePokemon = useGameStore(state => state.setActivePokemon);
  const setBenchPokemon = useGameStore(state => state.setBenchPokemon);
  const updatePokemonHp = useGameStore(state => state.updatePokemonHp);
  const addEnergy = useGameStore(state => state.addEnergy);
  const removeEnergy = useGameStore(state => state.removeEnergy);
  const setStatus = useGameStore(state => state.setStatus);
  const setHand = useGameStore(state => state.setHand);
  const p1Deck = useGameStore(state => state.player1Deck);
  const p2Deck = useGameStore(state => state.player2Deck);
  
  const deckEnergyTypes: string[] = (player === 'player1' ? p1Deck : p2Deck)?.energies?.map(e => e.type) || [];
  const enemyDeckTypes: string[] = (player === 'player1' ? p2Deck : p1Deck)?.energies?.map(e => e.type) || [];
  
  // Total energy cards available per type from the deck preset
  // Solo descuenta energías en el descarte (no pokémon que compartan tipo)
  const getEnergyType = (card: any): string | null => {
    if ('hp' in card) return null; // es pokémon
    // ScenarioEditor: type='energy', energyType='fire'
    if (card.energyType && card.energyType !== 'energy') return card.energyType;
    // startGame: type='fire'
    if (card.type && card.type !== 'energy') return card.type;
    return null;
  };
  
  const getEnergyLimit = (p: 'player1' | 'player2'): Record<string, number> => {
    const deck = p === 'player1' ? p1Deck : p2Deck;
    const state = p === 'player1' ? gameState.player1 : gameState.player2;
    const limits: Record<string, number> = {};
    deck?.energies?.forEach(e => { limits[e.type] = (limits[e.type] || 0) + e.quantity; });
    state.discardPile.forEach(c => {
      const t = getEnergyType(c);
      if (t && limits[t] !== undefined) limits[t] = Math.max(0, limits[t] - 1);
    });
    return limits;
  };
  const myEnergyLimits = getEnergyLimit(player);
  const enemyEnergyLimits = getEnergyLimit(player === 'player1' ? 'player2' : 'player1');
  
        const mySpecials = (player === 'player1' ? p1Deck : p2Deck)?.energies?.filter((e: any) => e.name && e.type === 'special') || [];
        const enemySpecials = (player === 'player1' ? p2Deck : p1Deck)?.energies?.filter((e: any) => e.name && e.type === 'special') || [];
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
              const _getTypeLimit = (t: string, limits: Record<string, number>, deck: any): number => {
        let total = limits[t] || 0;
        deck?.energies?.forEach((e: any) => {
          if (e.name && e.type !== 'special' && (e.type === t || e.name.toLowerCase().includes(t)))
            total += e.quantity;
        });
        return total;
      };
                const renderSpecials = (specials: any[], pokeRef: any, tgt: string, limitMap: Record<string, number>, stateRef: typeof playerState) => {
              if (specials.length === 0) return null;
              const totalUsed = (name: string) => {
                let count = 0;
                const addCount = (arr: string[]) => { arr.forEach(x => { if (x === name) count++; }); };
                if (stateRef.active) addCount(stateRef.active.attachedEnergy);
                stateRef.bench.forEach(p => { if (p) addCount(p.attachedEnergy); });
                return count;
              };
              return (
                <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                  <div className="energy-controls-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {specials.map((sp: any) => {
                      const c = pokeRef.attachedEnergy.filter((x: string) => x === sp.name).length;
                      const limit = limitMap[sp.name] || 0;
                      const used = totalUsed(sp.name);
                      return (
                        <div key={sp.name} className="energy-counter">
                          <button className="energy-btn-minus" onClick={() => removeEnergy(tgt, pokeRef.id, sp.name)} disabled={c === 0}>-</button>
                          <div className="energy-count-badge" style={{ backgroundColor: c > 0 ? '#9B7DFF' : '#333' }} title={sp.name}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{sp.name.replace(' Energy', '').slice(0, 8)}</span>
                            <span className="energy-badge-count">{c}</span>
                          </div>
                          <button className="energy-btn-plus" onClick={() => addEnergy(tgt, pokeRef.id, sp.name)} disabled={limit > 0 && used >= limit}>+</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            };
  // Count currently attached energy of each type for a player state
  const countAttachedEnergy = (ps: typeof playerState): Record<string, number> => {
    const counts: Record<string, number> = {};
    const add = (e: string) => { counts[e] = (counts[e] || 0) + 1; };
    if (ps.active) ps.active.attachedEnergy.forEach(add);
    ps.bench.forEach(p => { if (p) p.attachedEnergy.forEach(add); });
    return counts;
  };
  
  const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
  const opponentState = player === 'player1' ? gameState.player2 : gameState.player1;

  const handleAddPokemon = (card: PokemonCardType) => {
    const instance: PokemonInstance = {
      id: uuidv4(),
      card,
      currentHp: card.hp,
      attachedEnergy: [],
      status: 'none',
      damage: 0,
      isActive: !playerState.active,
    };

    if (!playerState.active) {
      setActivePokemon(player, instance);
    } else {
      const emptyBenchIndex = playerState.bench.findIndex(p => p === null);
      if (emptyBenchIndex !== -1) {
        setBenchPokemon(player, emptyBenchIndex, instance);
      }
    }
    setSelectedCard(null);
  };

  const handleEditHp = (id: string, newHp: number) => {
    updatePokemonHp(player, id, newHp);
  };

  const countEnergy = (id: string, type: EnergyType): number => {
    const p = playerState.active?.id === id ? playerState.active
      : playerState.bench.find(b => b?.id === id);
    return p ? p.attachedEnergy.filter(e => e === type).length : 0;
  };

  const handleStatusChange = (id: string, status: StatusCondition) => {
    setStatus(player, id, status);
  };

  // Note: Opponent hand controls moved to App.tsx for better layout
  // These functions can be re-enabled if needed for special scenarios
  /*
  const handleDrawOpponentCards = (count: number) => {
    drawCards('player2', count);
  };

  const handleSetOpponentHand = () => {
    // ...
  };

  const handleDragStartFromOpponentHand = (e: React.DragEvent, card: any) => {
    // ...
  };
  */

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToBench = (e: React.DragEvent, position: number, targetPlayer: 'player1' | 'player2' = 'player1') => {
    e.preventDefault();
    const cardData = e.dataTransfer.getData('card');
    if (!cardData) return;
    
    // Validate: only allow drops from the same player
    const fromPlayer = e.dataTransfer.getData('fromPlayer');
    if (fromPlayer && fromPlayer !== targetPlayer) {
      console.log('Cannot drop card from opponent to your bench!');
      return;
    }
    
    const card = JSON.parse(cardData);
    const fromHand = e.dataTransfer.getData('fromHand');
    const handIndex = parseInt(e.dataTransfer.getData('handIndex') || '-1');
    
    // Es un Pokémon
    if (card.hp && (card.stage || card.retreatCost)) {
      const pokemonCard: PokemonCardType = {
        id: uuidv4(),
        name: card.name || card.card?.name,
        stage: card.stage || 'basic',
        hp: card.hp || card.card?.hp || 100,
        type: card.type || card.card?.type || 'psychic',
        attacks: card.attacks || [],
        weakness: card.weakness,
        retreatCost: card.retreatCost || 1,
        rarity: card.rarity || 'common',
      };
      const instance: PokemonInstance = {
        id: uuidv4(),
        card: pokemonCard,
        currentHp: pokemonCard.hp,
        attachedEnergy: [],
        status: 'none',
        damage: 0,
        isActive: false,
        benchPosition: position,
      };
      // Use targetPlayer for bench placement
      setBenchPokemon(targetPlayer, position, instance);
      
      // Remove from hand if dragged from hand
      if (fromHand && handIndex >= 0) {
        const sourcePlayer = fromHand === 'opponent' ? 'player2' : 'player1';
        const sourceHand = sourcePlayer === 'player1' ? playerState.hand : opponentState.hand;
        const newHand = sourceHand.filter((_: any, i: number) => i !== handIndex);
        setHand(sourcePlayer, newHand);
      }
    }
  };

  const handleDropToActive = (e: React.DragEvent, targetPlayer: 'player1' | 'player2' = 'player1') => {
    e.preventDefault();
    const cardData = e.dataTransfer.getData('card');
    if (!cardData) return;
    
    // Validate: only allow drops from the same player
    const fromPlayer = e.dataTransfer.getData('fromPlayer');
    if (fromPlayer && fromPlayer !== targetPlayer) {
      console.log('Cannot drop card from opponent to your active!');
      return;
    }
    
    const card = JSON.parse(cardData);
    const fromHand = e.dataTransfer.getData('fromHand');
    const handIndex = parseInt(e.dataTransfer.getData('handIndex') || '-1');
    
    // Es un Pokémon
    if (card.hp && (card.stage || card.retreatCost)) {
      const pokemonCard: PokemonCardType = {
        id: uuidv4(),
        name: card.name || card.card?.name,
        stage: card.stage || 'basic',
        hp: card.hp || card.card?.hp || 100,
        type: card.type || card.card?.type || 'psychic',
        attacks: card.attacks || [],
        weakness: card.weakness,
        retreatCost: card.retreatCost || 1,
        rarity: card.rarity || 'common',
      };
      const instance: PokemonInstance = {
        id: uuidv4(),
        card: pokemonCard,
        currentHp: pokemonCard.hp,
        attachedEnergy: [],
        status: 'none',
        damage: 0,
        isActive: true,
      };
      // Use targetPlayer for active placement
      setActivePokemon(targetPlayer, instance);
      
      // Remove from hand if dragged from hand
      if (fromHand && handIndex >= 0) {
        const sourcePlayer = fromHand === 'opponent' ? 'player2' : 'player1';
        const sourceHand = sourcePlayer === 'player1' ? playerState.hand : opponentState.hand;
        const newHand = sourceHand.filter((_: any, i: number) => i !== handIndex);
        setHand(sourcePlayer, newHand);
      }
    }
  };

  return (
    <div className={`battle-field ${isCurrentPlayer ? 'current' : ''}`}>
      {/* La mano del oponente ahora se muestra en App.tsx (panel derecho) */}
      
      <div className="prizes">
        <span className="prize-label">Prizes: {opponentState.prizes.length}</span>
      </div>

      {/* Oponente - Bench primero (abajo), luego Active (arriba) */}
                <div className="opponent-bench">
            {[0, 1, 2, 3, 4].map(i => (
              <div 
                key={`bench-${i}`} 
                className="bench-slot"
                onDrop={(e) => handleDropToBench(e, i, 'player2')}
                onDragOver={handleDragOver}
              >
                {opponentState.bench[i] ? (
                  <div className="pokemon-instance" onClick={() => setEditingEnemy(opponentState.bench[i]!.id)}>
                    <PokemonCard pokemon={opponentState.bench[i]!} selected={editingEnemy === opponentState.bench[i]!.id} />
                    {editingEnemy === opponentState.bench[i]!.id && (
                      <div className="edit-panel">
                        <div className="edit-field">
                          <label>HP:</label>
                          <div className="hp-controls">
                            <button className="hp-btn" onClick={() => updatePokemonHp('player2', opponentState.bench[i]!.id, opponentState.bench[i]!.currentHp - 10)}>-10</button>
                            <span className="hp-value">{opponentState.bench[i]!.currentHp}</span>
                            <button className="hp-btn" onClick={() => updatePokemonHp('player2', opponentState.bench[i]!.id, opponentState.bench[i]!.currentHp + 10)}>+10</button>
                          </div>
                        </div>
                        <div className="edit-field">
                          <label>Energía:</label>
                          <div className="energy-controls-grid">
                            {[...BASIC_ENERGY].filter(e => enemyDeckTypes.length === 0 || enemyDeckTypes.includes(e.t)).map(({ t, icon, label }) => {
                              const count = opponentState.bench[i]!.attachedEnergy.filter(x => x === t).length;
                              return (
                                <div key={t} className="energy-counter">
                                  <button className="energy-btn-minus" onClick={() => removeEnergy('player2', opponentState.bench[i]!.id, t)} disabled={count === 0}>−</button>
                                  <div className="energy-count-badge" style={{ backgroundColor: count > 0 ? energyColors[t] : '#333' }} title={label}>
                                    <span className="energy-badge-icon">{icon}</span>
                                    <span className="energy-badge-count">{count}</span>
                                  </div>
                                  <button className="energy-btn-plus" onClick={() => addEnergy('player2', opponentState.bench[i]!.id, t)} disabled={(countAttachedEnergy(opponentState)[t] || 0) >= _getTypeLimit(t, enemyEnergyLimits, player === 'player1' ? p2Deck : p1Deck)}>+</button>
                                </div>
                              );
                            })}
                          </div>
                          {renderSpecials(enemySpecials, opponentState.bench[i]!, 'player2', enemyEnergyLimits, opponentState)}
                        </div>
                        <button className="close-edit" onClick={(e) => { e.stopPropagation(); setEditingEnemy(null); }}>✕</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-slot">+</div>
                )}
              </div>
            ))}
          </div>

                <div className="opponent-active">
        {opponentState.active ? (
          <div className="pokemon-instance" onClick={() => setEditingEnemy(opponentState.active!.id)}>
            <PokemonCard 
              pokemon={opponentState.active} 
              showDetails
              selected={editingEnemy === opponentState.active!.id}
            />
            {editingEnemy === opponentState.active!.id && (
              <div className="edit-panel">
                <div className="edit-field">
                  <label>HP:</label>
                  <div className="hp-controls">
                    <button className="hp-btn" onClick={() => updatePokemonHp('player2', opponentState.active!.id, opponentState.active.currentHp - 10)}>-10</button>
                    <span className="hp-value">{opponentState.active.currentHp}</span>
                    <button className="hp-btn" onClick={() => updatePokemonHp('player2', opponentState.active!.id, opponentState.active.currentHp + 10)}>+10</button>
                  </div>
                </div>
                <div className="edit-field">
                  <label>Estado:</label>
                  <select
                    value={opponentState.active.status}
                    onChange={e => setStatus('player2', opponentState.active!.id, e.target.value as StatusCondition)}
                  >
                    <option value="none">Ninguno</option>
                    <option value="poisoned">Envenenado</option>
                    <option value="poisoned1">Envenenado +1</option>
                    <option value="poisoned2">Envenenado +2</option>
                    <option value="poisoned3">Envenenado +3</option>
                    <option value="paralyzed">Paralizado</option>
                    <option value="asleep">Dormido</option>
                    <option value="confused">Confuso</option>
                  </select>
                </div>
                <div className="edit-field">
                  <label>Energía:</label>
                  <div className="energy-controls-grid">
                    {[...BASIC_ENERGY].filter(e => enemyDeckTypes.length === 0 || enemyDeckTypes.includes(e.t)).map(({ t, icon, label }) => {
                      const count = opponentState.active!.attachedEnergy.filter(x => x === t).length;
                      return (
                        <div key={t} className="energy-counter">
                          <button className="energy-btn-minus" onClick={() => removeEnergy('player2', opponentState.active!.id, t)} disabled={count === 0}>−</button>
                          <div className="energy-count-badge" style={{ backgroundColor: count > 0 ? energyColors[t] : '#333' }} title={label}>
                            <span className="energy-badge-icon">{icon}</span>
                            <span className="energy-badge-count">{count}</span>
                          </div>
                          <button className="energy-btn-plus" onClick={() => addEnergy('player2', opponentState.active!.id, t)} disabled={(countAttachedEnergy(opponentState)[t] || 0) >= _getTypeLimit(t, enemyEnergyLimits, player === 'player1' ? p2Deck : p1Deck)}>+</button>
                        </div>
                      );
                    })}
                  </div>
                  {renderSpecials(enemySpecials, opponentState.active!, 'player2', enemyEnergyLimits, opponentState)}
                </div>
                <button className="close-edit" onClick={(e) => { e.stopPropagation(); setEditingEnemy(null); }}>✕</button>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="empty-slot"
            onDrop={(e) => handleDropToActive(e, 'player2')}
            onDragOver={handleDragOver}
          >
            Arrastra Pokémon
          </div>
        )}
      </div>

      <div className="player-section you">
        <h4>⚔️ {player === 'player1' ? 'Tú' : 'Oponente'}</h4>
        
        <div className="deck-info">
          <span>Deck: {playerState.deck.length}</span>
          <span>Discard: {playerState.discardPile.length}</span>
        </div>

        <div className="your-active">
          <h5>Activo</h5>
          {playerState.active ? (
            <div className="pokemon-instance" onClick={() => setEditingId(playerState.active!.id)}>
              <PokemonCard 
                pokemon={playerState.active} 
                showDetails
                selected={editingId === playerState.active!.id}
              />
              {editingId === playerState.active!.id && (
                <div className="edit-panel">
                  <div className="edit-field">
                    <label>HP:</label>
                    <div className="hp-controls">
                      <button className="hp-btn" onClick={() => handleEditHp(playerState.active!.id, playerState.active.currentHp - 10)}>-10</button>
                      <span className="hp-value">{playerState.active.currentHp}</span>
                      <button className="hp-btn" onClick={() => handleEditHp(playerState.active!.id, playerState.active.currentHp + 10)}>+10</button>
                    </div>
                  </div>
                  <div className="edit-field">
                    <label>Estado:</label>
                    <select
                      value={playerState.active.status}
                      onChange={e => handleStatusChange(playerState.active!.id, e.target.value as StatusCondition)}
                    >
                      <option value="none">Ninguno</option>
                      <option value="poisoned">Envenenado</option>
                      <option value="poisoned1">Envenenado +1</option>
                      <option value="poisoned2">Envenenado +2</option>
                      <option value="poisoned3">Envenenado +3</option>
                      <option value="paralyzed">Paralizado</option>
                      <option value="asleep">Dormido</option>
                      <option value="confused">Confuso</option>
                    </select>
                  </div>
                  <div className="edit-field">
                    <label>Energía:</label>
                    <div className="energy-controls-grid">
                      {[...BASIC_ENERGY].filter(e => deckEnergyTypes.length === 0 || deckEnergyTypes.includes(e.t)).map(({ t, icon, label }) => {
                        const count = playerState.active!.attachedEnergy.filter(x => x === t).length;
                        return (
                          <div key={t} className="energy-counter">
                            <button
                              className="energy-btn-minus"
                              onClick={() => removeEnergy(player, playerState.active!.id, t)}
                              disabled={count === 0}
                            >−</button>
                            <div
                              className="energy-count-badge"
                              style={{ backgroundColor: count > 0 ? energyColors[t] : '#333' }}
                              title={label}
                            >
                              <span className="energy-badge-icon">{icon}</span>
                              <span className="energy-badge-count">{count}</span>
                            </div>
                            <button
                              className="energy-btn-plus"
                              onClick={() => addEnergy(player, playerState.active!.id, t)}
                             disabled={(countAttachedEnergy(playerState)[t] || 0) >= _getTypeLimit(t, myEnergyLimits, player === 'player1' ? p1Deck : p2Deck)}>+</button>
                          </div>
                        );
                      })}
                    </div>
                    {renderSpecials(mySpecials, playerState.active!, player, myEnergyLimits, playerState)}
                  </div>
                  <button className="close-edit" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>✕</button>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="empty-slot active-slot"
              onDrop={handleDropToActive}
              onDragOver={handleDragOver}
            >
              Arrastra un Pokémon aquí
            </div>
          )}
        </div>

        <div className="your-bench">
          <h5>Bench (máx 5)</h5>
          <div className="bench-grid">
            {[0, 1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className="bench-slot"
                onDrop={(e) => handleDropToBench(e, i)}
                onDragOver={handleDragOver}
                onClick={() => playerState.bench[i] && setEditingId(playerState.bench[i]!.id)}
              >
                {playerState.bench[i] ? (
                  <div className="pokemon-instance">
                    <PokemonCard 
                      pokemon={playerState.bench[i]!} 
                      selected={editingId === playerState.bench[i]!.id}
                    />
                    {editingId === playerState.bench[i]!.id && (
                      <div className="edit-panel">
                        <div className="edit-field">
                          <label>HP:</label>
                          <div className="hp-controls">
                            <button className="hp-btn" onClick={() => updatePokemonHp(player, playerState.bench[i]!.id, playerState.bench[i]!.currentHp - 10)}>-10</button>
                            <span className="hp-value">{playerState.bench[i]!.currentHp}</span>
                            <button className="hp-btn" onClick={() => updatePokemonHp(player, playerState.bench[i]!.id, playerState.bench[i]!.currentHp + 10)}>+10</button>
                          </div>
                        </div>
                        <div className="edit-field">
                          <label>Energía:</label>
                          <div className="energy-controls-grid">
                            {[...BASIC_ENERGY].filter(e => deckEnergyTypes.length === 0 || deckEnergyTypes.includes(e.t)).map(({ t, icon, label }) => {
                              const count = playerState.bench[i]!.attachedEnergy.filter(x => x === t).length;
                              return (
                                <div key={t} className="energy-counter">
                                  <button className="energy-btn-minus" onClick={() => removeEnergy(player, playerState.bench[i]!.id, t)} disabled={count === 0}>−</button>
                                  <div className="energy-count-badge" style={{ backgroundColor: count > 0 ? energyColors[t] : '#333' }} title={label}>
                                    <span className="energy-badge-icon">{icon}</span>
                                    <span className="energy-badge-count">{count}</span>
                                  </div>
                                  <button className="energy-btn-plus" onClick={() => addEnergy(player, playerState.bench[i]!.id, t)} disabled={(countAttachedEnergy(playerState)[t] || 0) >= _getTypeLimit(t, myEnergyLimits, player === 'player1' ? p1Deck : p2Deck)}>+</button>
                                </div>
                              );
                            })}
                          </div>
                          {renderSpecials(mySpecials, playerState.bench[i]!, player, myEnergyLimits, playerState)}
                        </div>
                        <button className="close-edit" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>✕</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-slot">+</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedCard && (
        <div className="card-picker-modal">
          <div className="modal-content">
            <h4>Seleccionar {selectedCard.name}</h4>
            <p>¿Dónde quieres colocar este Pokémon?</p>
            <div className="modal-buttons">
              {!playerState.active && (
                <button onClick={() => handleAddPokemon(selectedCard)}>
                  🟡 Activo
                </button>
              )}
              {playerState.active && playerState.bench.filter(Boolean).length < 5 && (
                <button onClick={() => handleAddPokemon(selectedCard)}>
                  🟢 Bench
                </button>
              )}
              <button onClick={() => setSelectedCard(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
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
  
  const handleOpenDeckModal = () => {
    loadCustomDecks();
    setShowDeck(true);
  };
  
  const handleSelectDeckPlayer1 = (deck: DeckPreset) => {
    setPlayer1Deck(deck);
  };
  
  const handleSelectDeckPlayer2 = (deck: DeckPreset) => {
    setPlayer2Deck(deck);
  };
  
  const handleStartGame = () => {
    if (player1Deck && player2Deck) {
      startGame();
      setShowDeck(false);
    }
  };
  
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; cardName: string } | null>(null);
  
  const handleImport = async (targetPlayer: 'player1' | 'player2') => {
    const text = targetPlayer === 'player1' ? importTextP1 : importTextP2;
    if (!text.trim()) return;
    
    try {
      const deckName = prompt(`Nombre del mazo para ${targetPlayer === 'player1' ? 'Player 1' : 'Player 2'}:`) || `Mazo ${targetPlayer === 'player1' ? 'Player 1' : 'Player 2'}`;
      
      setImportProgress({ current: 0, total: 1, cardName: 'Iniciando...' });
      
      const { pokemon, trainers, energies } = await parseDeckListWithApi(text, (current, total, cardName) => {
        setImportProgress({ current, total, cardName });
      });
      
      setImportProgress(null);
      
      if (pokemon.length > 0 || trainers.length > 0 || energies.length > 0) {
        const newDeck = {
          id: uuidv4(),
          name: deckName,
          description: 'Mazo importado con datos de API',
          pokemon,
          trainers,
          energies,
        };
        
        if (targetPlayer === 'player1') {
          setPlayer1Deck(newDeck);
          setImportTextP1('');
        } else {
          setPlayer2Deck(newDeck);
          setImportTextP2('');
        }
        
        addCustomDeck(newDeck);
        console.log(`✅ Deck "${deckName}" importado con ${pokemon.length} Pokémon`);
      }
    } catch (error) {
      console.error('Error importing deck:', error);
      setImportProgress(null);
      alert('Error al importar el mazo. Intenta de nuevo.');
    }
  };
  
  // Render
  return (
    <div className="deck-selector">
      <button className="select-deck-btn" onClick={handleOpenDeckModal}>
        🎴 Nueva Partida
      </button>
      
      {showDeck && (
        <div className="deck-modal">
          <div className="modal-content deck-modal-wide">
            <h3>Seleccionar Mazos</h3>
            
            <div className="import-section">
              <label>🎯 Importar mazo Player 1:</label>
              <textarea 
                value={importTextP1}
                onChange={e => setImportTextP1(e.target.value)}
                placeholder="Pega el deck list de Player 1..."
                rows={3}
              />
              <button onClick={() => handleImport('player1')} className="import-btn" disabled={!importTextP1.trim() || importProgress !== null}>
                Importar Player 1
              </button>
            </div>

            <div className="import-section">
              <label>⚔️ Importar mazo Player 2:</label>
              <textarea 
                value={importTextP2}
                onChange={e => setImportTextP2(e.target.value)}
                placeholder="Pega el deck list de Player 2..."
                rows={3}
              />
              <button onClick={() => handleImport('player2')} className="import-btn" disabled={!importTextP2.trim() || importProgress !== null}>
                Importar Player 2
              </button>
            </div>

            {importProgress && (
              <div className="import-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <p className="progress-text">
                  🔄 Buscando: {importProgress.cardName} ({importProgress.current}/{importProgress.total})
                </p>
              </div>
            )}

            <div className="deck-selection-grid">
              <div className="deck-player-section">
                <h4>🎯 Tu Mazo</h4>
                {player1Deck ? (
                  <div className="selected-deck">
                    <span>{player1Deck.name}</span>
                    <button onClick={() => setPlayer1Deck(null)}>Cambiar</button>
                  </div>
                ) : (
                  <>
                    <p className="no-deck-message">No hay mazo seleccionado</p>
                    <div className="deck-list">
                      {customDecks.map(deck => (
                        <button 
                          key={deck.id}
                          className="deck-option"
                          onClick={() => handleSelectDeckPlayer1(deck)}
                        >
                          {deck.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="deck-player-section">
                <h4>⚔️ Oponente</h4>
                {player2Deck ? (
                  <div className="selected-deck">
                    <span>{player2Deck.name}</span>
                    <button onClick={() => setPlayer2Deck(null)}>Cambiar</button>
                  </div>
                ) : (
                  <>
                    <p className="no-deck-message">No hay mazo seleccionado</p>
                    <div className="deck-list">
                      {customDecks.map(deck => (
                        <button 
                          key={deck.id}
                          className="deck-option"
                          onClick={() => handleSelectDeckPlayer2(deck)}
                        >
                          {deck.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              className="start-game-btn" 
              onClick={handleStartGame}
              disabled={!player1Deck || !player2Deck}
            >
              Iniciar Partida
            </button>
            <button className="close-btn" onClick={() => setShowDeck(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}