import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { v4 as uuidv4 } from 'uuid';
import { energyTypes, energyColors } from '../data/decks';

type EditingSection = 'prizes' | 'hand' | 'discard' | 'deck' | 'active' | 'bench' | 'picker' | 'all';

interface Props {
  player: 'player1' | 'player2';
}

export function ScenarioEditor({ player }: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [section, setSection] = useState<EditingSection>('all');
  const [filterText, setFilterText] = useState('');
  
  const gameState = useGameStore(state => state.gameState);
  const setActivePokemon = useGameStore(state => state.setActivePokemon);
  const setBenchPokemon = useGameStore(state => state.setBenchPokemon);
  const setHand = useGameStore(state => state.setHand);
  const setDiscard = useGameStore(state => state.setDiscard);
  const setDeck = useGameStore(state => state.setDeck);
  const setPrizes = useGameStore(state => state.setPrizes);
  const updatePokemonHp = useGameStore(state => state.updatePokemonHp);
  const clearActivePokemon = useGameStore(state => state.clearActivePokemon);
  const clearBenchPokemon = useGameStore(state => state.clearBenchPokemon);
  const setStatus = useGameStore(state => state.setStatus);
  const addEnergy = useGameStore(state => state.addEnergy);
  const removeEnergy = useGameStore(state => state.removeEnergy);
  const player1Deck = useGameStore(state => state.player1Deck);
  const player2Deck = useGameStore(state => state.player2Deck);
  
  const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
  const playerLabel = player === 'player1' ? 'Tú' : 'Oponente';
  const selectedDeck = player === 'player1' ? player1Deck : player2Deck;
  
  // Get names of all used cards FIRST (prizes, hand, discard, active, bench, deck)
  const usedCardNames = new Set<string>();
  playerState.prizes.forEach(c => usedCardNames.add(c.name));
  playerState.hand.forEach(c => usedCardNames.add(c.name));
  playerState.discardPile.forEach(c => usedCardNames.add(c.name));
  if (playerState.active) usedCardNames.add(playerState.active.card.name);
  playerState.bench.forEach(p => {
    if (p) usedCardNames.add(p.card.name);
  });
  // Also exclude cards already in deck
  playerState.deck.forEach(c => usedCardNames.add(c.name));
  
  // Get pokemon from the selected deck, excluding only those in prizes or already in use (scenario simulator)
  const prizesCardNames = new Set<string>();
  playerState.prizes.forEach(c => prizesCardNames.add(c.name));
  
  // Cards already placed in Active, Bench or Hand cannot be reused
  const inUseCardNames = new Set<string>();
  if (playerState.active) inUseCardNames.add(playerState.active.card.name);
  playerState.bench.forEach(p => {
    if (p) inUseCardNames.add(p.card.name);
  });
  playerState.hand.forEach(c => inUseCardNames.add(c.name));
  
  const deckPokemon = selectedDeck 
    ? selectedDeck.pokemon.filter(p => !prizesCardNames.has(p.name) && !inUseCardNames.has(p.name)) 
    : [];
  
  // Get all cards (pokemon + trainers + energies) from deck
  const deckCards = selectedDeck 
    ? [
        ...selectedDeck.pokemon.map(c => ({ ...c, category: 'pokemon' })),
        ...selectedDeck.trainers.map(c => ({ ...c, category: 'trainer' })),
        ...(selectedDeck.energies || []).flatMap(e => 
          Array(e.quantity).fill({ name: e.type + ' Energy', type: 'energy', energyType: e.type, category: 'energy' })
        ),
      ]
    : [];
  
  // Filter available cards (exclude used ones for the "picker" tab)
  const availableCards = deckCards.filter(c => !usedCardNames.has(c.name));
  
  // All deck cards (for card picker - exclude cards in prizes or already in Active/Bench)
  const allDeckCards = deckCards.filter(c => !prizesCardNames.has(c.name) && !inUseCardNames.has(c.name));
  
  const addCards = (cards: any[], target: 'hand' | 'discard' | 'prizes' | 'deck') => {
    const playerObj = player === 'player1' ? 'player1' : 'player2';
    switch (target) {
      case 'hand':
        setHand(playerObj, [...playerState.hand, ...cards]);
        break;
      case 'discard':
        setDiscard(playerObj, [...playerState.discardPile, ...cards]);
        break;
      case 'prizes':
        setPrizes(playerObj, [...playerState.prizes, ...cards]);
        break;
      case 'deck':
        setDeck(playerObj, [...playerState.deck, ...cards]);
        break;
    }
  };
  
  const addCardFromPicker = (card: any, target: 'hand' | 'discard' | 'prizes' | 'deck') => {
    const cardWithId = { ...card, id: uuidv4() };
    addCards([cardWithId], target);
    setFilterText('');
  };
  
  const handleRemoveCard = (target: 'hand' | 'discard' | 'prizes' | 'deck', index: number) => {
    const playerObj = player === 'player1' ? 'player1' : 'player2';
    let removedCard: any = null;
    
    switch (target) {
      case 'hand':
        removedCard = playerState.hand[index];
        setHand(playerObj, playerState.hand.filter((_, i) => i !== index));
        break;
      case 'discard':
        removedCard = playerState.discardPile[index];
        setDiscard(playerObj, playerState.discardPile.filter((_, i) => i !== index));
        break;
      case 'prizes':
        removedCard = playerState.prizes[index];
        setPrizes(playerObj, playerState.prizes.filter((_, i) => i !== index));
        break;
    }
    
    // Add removed card back to deck
    if (removedCard) {
      const cardWithId = { ...removedCard, id: uuidv4() };
      setDeck(playerObj, [...playerState.deck, cardWithId]);
    }
  };
  
  const handleSetActive = (card: any) => {
    if (!card) return;
    const instance = {
      id: uuidv4(),
      card: {
        id: uuidv4(),
        name: card.name,
        stage: card.stage || 'basic',
        hp: card.hp || 100,
        type: card.type || 'psychic',
        attacks: card.attacks || [],
        weakness: card.weakness,
        retreatCost: card.retreatCost || 1,
        rarity: card.rarity || 'common',
      },
      currentHp: card.hp || 100,
      attachedEnergy: [],
      status: 'none' as const,
      damage: 0,
      isActive: true,
    };
    setActivePokemon(player, instance);
  };
   
  const handleSetBench = (card: any, position: number) => {
    if (!card) return;
    const instance = {
      id: uuidv4(),
      card: {
        id: uuidv4(),
        name: card.name,
        stage: card.stage || 'basic',
        hp: card.hp || 100,
        type: card.type || 'psychic',
        attacks: card.attacks || [],
        weakness: card.weakness,
        retreatCost: card.retreatCost || 1,
        rarity: card.rarity || 'common',
      },
      currentHp: card.hp || 100,
      attachedEnergy: [],
      status: 'none' as const,
      damage: 0,
      isActive: false,
      benchPosition: position,
    };
    setBenchPokemon(player, position, instance);
  };
  
  const fillRemainingDeck = () => {
    if (!selectedDeck) return;
    
    // Get all cards that are already used
    const usedCards = new Set<string>();
    
    // Add prizes
    playerState.prizes.forEach(c => usedCards.add(c.name));
    // Add hand
    playerState.hand.forEach(c => usedCards.add(c.name));
    // Add discard
    playerState.discardPile.forEach(c => usedCards.add(c.name));
    // Add active
    if (playerState.active) usedCards.add(playerState.active.card.name);
    // Add bench
    playerState.bench.forEach(p => {
      if (p) usedCards.add(p.card.name);
    });
    
    // Get remaining cards from deck
    const remaining = [
      ...selectedDeck.pokemon.filter(c => !usedCards.has(c.name)),
      ...selectedDeck.trainers.filter(c => !usedCards.has(c.name)),
      ...(selectedDeck.energies || []).flatMap(e => 
        Array(e.quantity).fill({ name: e.type + ' Energy', type: 'energy', energyType: e.type })
          .filter(c => !usedCards.has(c.name))
      ),
    ];
    
    // Add IDs and set to deck
    const deckWithIds = remaining.map(c => ({ ...c, id: uuidv4() }));
    setDeck(player, deckWithIds);
  };
  
  const renderCardList = (cards: any[], target: 'hand' | 'discard' | 'prizes') => (
    <div className="card-list">
      {cards.length === 0 ? (
        <div className="empty-list">Vacío ({cards.length})</div>
      ) : (
        cards.map((card: any, i: number) => (
          <div key={i} className="card-item">
            <span className="card-name">{card.name}</span>
            <button onClick={() => handleRemoveCard(target, i)} className="remove-btn">✕</button>
          </div>
        ))
      )}
    </div>
  );
  
  const renderDeckList = (cards: any[]) => (
    <div className="card-list">
      {cards.length === 0 ? (
        <div className="empty-list">Vacío (0)</div>
      ) : (
        <div className="deck-count-info">{cards.length} cartas</div>
      )}
    </div>
  );
  
  if (!showEditor) {
    return (
      <button className="editor-toggle-btn" onClick={() => setShowEditor(true)}>
        ✏️ Editar {playerLabel}
      </button>
    );
  }
  
  return (
    <div className="scenario-editor">
      <div className="editor-header">
        <h4>✏️ Editor {playerLabel}</h4>
        <div className="header-actions">
          <button className="fill-deck-btn" onClick={fillRemainingDeck} title="Completar deck con cartas restantes">
            🎯 Completar Deck
          </button>
          <button onClick={() => setShowEditor(false)} className="close-btn">✕</button>
        </div>
      </div>
      
      <div className="editor-tabs">
        <button className={section === 'picker' ? 'active' : ''} onClick={() => setSection('picker')}>📋 Cartas</button>
        <button className={section === 'all' ? 'active' : ''} onClick={() => setSection('all')}>Todo</button>
        <button className={section === 'prizes' ? 'active' : ''} onClick={() => setSection('prizes')}>Prizes</button>
        <button className={section === 'hand' ? 'active' : ''} onClick={() => setSection('hand')}>Mano</button>
        <button className={section === 'discard' ? 'active' : ''} onClick={() => setSection('discard')}>Desc.</button>
        <button className={section === 'deck' ? 'active' : ''} onClick={() => setSection('deck')}>Deck</button>
        <button className={section === 'active' ? 'active' : ''} onClick={() => setSection('active')}>Active</button>
        <button className={section === 'bench' ? 'active' : ''} onClick={() => setSection('bench')}>Bench</button>
      </div>
      
      <div className="editor-content">
        {section === 'picker' && selectedDeck && (
          <div className="editor-section">
            <h5>📋 Cartas de {selectedDeck.name} ({availableCards.length})</h5>
            <input
              type="text"
              placeholder="Buscar carta..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="card-filter-input"
            />
            <div className="card-picker-grid">
              {availableCards
                .filter(c => !filterText || c.name.toLowerCase().includes(filterText.toLowerCase()))
                .map((card, i) => (
                  <div key={i} className="card-picker-item">
                    <span className="picker-card-name">{card.name}</span>
                    <span className="picker-card-type">{card.category}</span>
                    <div className="picker-buttons">
                      <button onClick={() => addCardFromPicker(card, 'hand')}>Mano</button>
                      <button onClick={() => addCardFromPicker(card, 'prizes')}>Prize</button>
                      <button onClick={() => addCardFromPicker(card, 'discard')}>Desc.</button>
                    </div>
                  </div>
                ))}
            </div>
            {!selectedDeck && (
              <p className="no-deck-message">
                Seleccioná un mazo primero en "Nueva Partida"
              </p>
            )}
          </div>
        )}
        
        {(section === 'all' || section === 'prizes') && (
          <div className="editor-section">
            <h5>🎯 Prizes ({playerState.prizes.length})</h5>
            {renderCardList(playerState.prizes, 'prizes')}
            
            <div className="card-quick-picker">
              <h6>Agregar carta ({allDeckCards.length})</h6>
              <input
                type="text"
                placeholder="Buscar..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="card-filter-input"
              />
              <div className="card-picker-list">
                {allDeckCards
                  .filter(c => !filterText || c.name.toLowerCase().includes(filterText.toLowerCase()))
                  .map((card, i) => (
                    <div key={i} className="card-picker-option" onClick={() => addCardFromPicker(card, 'prizes')}>
                      <span className="card-picker-name">{card.name}</span>
                      <span className="card-picker-type">{card.category}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'hand') && (
          <div className="editor-section">
            <h5>🃏 Mano ({playerState.hand.length})</h5>
            {renderCardList(playerState.hand, 'hand')}
            
            <div className="card-quick-picker">
              <h6>Agregar carta ({allDeckCards.length})</h6>
              <input
                type="text"
                placeholder="Buscar..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="card-filter-input"
              />
              <div className="card-picker-list">
                {allDeckCards
                  .filter(c => !filterText || c.name.toLowerCase().includes(filterText.toLowerCase()))
                  .map((card, i) => (
                    <div key={i} className="card-picker-option" onClick={() => addCardFromPicker(card, 'hand')}>
                      <span className="card-picker-name">{card.name}</span>
                      <span className="card-picker-type">{card.category}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'discard') && (
          <div className="editor-section">
            <h5>🗑️ Descarte ({playerState.discardPile.length})</h5>
            {renderCardList(playerState.discardPile, 'discard')}
            
            <div className="card-quick-picker">
              <h6>Agregar carta ({allDeckCards.length})</h6>
              <input
                type="text"
                placeholder="Buscar..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="card-filter-input"
              />
              <div className="card-picker-list">
                {allDeckCards
                  .filter(c => !filterText || c.name.toLowerCase().includes(filterText.toLowerCase()))
                  .map((card, i) => (
                    <div key={i} className="card-picker-option" onClick={() => addCardFromPicker(card, 'discard')}>
                      <span className="card-picker-name">{card.name}</span>
                      <span className="card-picker-type">{card.category}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'deck') && (
          <div className="editor-section">
            <h5>📚 Deck ({playerState.deck.length})</h5>
            {renderDeckList(playerState.deck)}
            
            <div className="card-quick-picker">
              <h6>Agregar carta ({allDeckCards.length})</h6>
              <input
                type="text"
                placeholder="Buscar..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="card-filter-input"
              />
              <div className="card-picker-list">
                {allDeckCards
                  .filter(c => !filterText || c.name.toLowerCase().includes(filterText.toLowerCase()))
                  .map((card, i) => (
                    <div key={i} className="card-picker-option" onClick={() => addCardFromPicker(card, 'deck')}>
                      <span className="card-picker-name">{card.name}</span>
                      <span className="card-picker-type">{card.category}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'active') && (
          <div className="editor-section">
            <h5>🔥 Active</h5>
            {playerState.active && (() => {
              const active = playerState.active;
              return (
              <div className="pokemon-editable">
                <span className="pokemon-name">{active.card.name}</span>
                <span className="pokemon-hp">{active.currentHp}/{active.card.hp} HP</span>
                <div className="pokemon-controls">
                  <button onClick={() => updatePokemonHp(player, active.id, active.currentHp - 10)}>-10</button>
                  <button onClick={() => updatePokemonHp(player, active.id, active.currentHp - 20)}>-20</button>
                  <button onClick={() => updatePokemonHp(player, active.id, active.currentHp + 10)}>+10</button>
                  <button onClick={() => updatePokemonHp(player, active.id, active.currentHp + 20)}>+20</button>
                </div>
                <div className="status-select">
                  <select
                    value={active.status}
                    onChange={e => setStatus(player, active.id, e.target.value as any)}
                  >
                    <option value="none">Normal</option>
                    <option value="poisoned">Envenenado</option>
                    <option value="poisoned1">Envenenado +1</option>
                    <option value="poisoned2">Envenenado +2</option>
                    <option value="poisoned3">Envenenado +3</option>
                    <option value="paralyzed">Paralizado</option>
                    <option value="asleep">Dormido</option>
                    <option value="confused">Confuso</option>
                  </select>
                </div>
                
                {/* Energy Controls */}
                <div className="energy-controls">
                  <span className="energy-label">⚡ Energía ({active.attachedEnergy.length})</span>
                  <div className="energy-buttons">
                    {energyTypes.map(e => (
                      <button
                        key={e}
                        className={`energy-btn ${active.attachedEnergy.includes(e) ? 'attached' : ''}`}
                        style={{ backgroundColor: active.attachedEnergy.includes(e) ? energyColors[e] : undefined }}
                        onClick={() => {
                          if (active.attachedEnergy.includes(e)) {
                            removeEnergy(player, active.id, e);
                          } else {
                            addEnergy(player, active.id, e);
                          }
                        }}
                        title={e}
                      >
                        {e[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {active.attachedEnergy.length > 0 && (
                    <div className="energy-list">
                      {active.attachedEnergy.map((e, i) => (
                        <span key={i} className="energy-badge" style={{ backgroundColor: energyColors[e] }}>{e}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Retreat Info */}
                <div className="retreat-info">
                  <span>Retreat: {active.card.retreatCost} energías</span>
                  {active.attachedEnergy.length >= active.card.retreatCost && (
                    <span className="retreat-ready">✓ Listo para retreat</span>
                  )}
                  {active.attachedEnergy.length < active.card.retreatCost && (
                    <span className="retreat-need">Necesitás {active.card.retreatCost - active.attachedEnergy.length} más</span>
                  )}
                </div>
                
                <button className="remove-active-btn" onClick={() => clearActivePokemon(player)}>
                  🗑️ Quitar Active
                </button>
              </div>
              );
            })()}
            {(() => !playerState.active && (
              <div className="empty-active">Sin Pokémon activo</div>
            ))()}
            
            <div className="pokemon-quick-picker">
              <h6>Pokémon disponibles ({deckPokemon.length})</h6>
              <div className="pokemon-picker-list">
                {deckPokemon.length === 0 ? (
                  <p className="no-pokemon">No hay Pokémon disponibles</p>
                ) : (
                  deckPokemon
                    .filter(p => !filterText || p.name.toLowerCase().includes(filterText.toLowerCase()))
                    .map((pokemon, i) => (
                      <div key={i} className="pokemon-picker-item" onClick={() => handleSetActive(pokemon)}>
                        <span>{pokemon.name}</span>
                        <span className="pokemon-info">{pokemon.stage} {pokemon.hp}HP</span>
                      </div>
                    ))
                )}
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="card-filter-input"
              />
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'bench') && (
          <div className="editor-section">
            <h5>🪑 Bench</h5>
            <div className="bench-slots-editor">
              {[0, 1, 2, 3, 4].map(i => {
                const benchPokemon = playerState.bench[i];
                return (
                  <div key={i} className="bench-slot-editor">
                    <span className="slot-number">#{i + 1}</span>
                    {benchPokemon ? (
                      <div className="bench-pokemon-full">
                        <div className="bench-pokemon-header">
                          <span className="bench-pokemon-name">{benchPokemon.card.name}</span>
                          <span className="bench-pokemon-hp">{benchPokemon.currentHp}/{benchPokemon.card.hp} HP</span>
                        </div>
                        <div className="bench-energy-row">
                          <span className="energy-count">⚡{benchPokemon.attachedEnergy.length}</span>
                          <div className="bench-energy-buttons">
                            {energyTypes.slice(0, 4).map(e => (
                              <button
                                key={e}
                                className={`bench-energy-btn ${benchPokemon.attachedEnergy.includes(e) ? 'attached' : ''}`}
                                style={{ backgroundColor: benchPokemon.attachedEnergy.includes(e) ? energyColors[e] : undefined }}
                                onClick={() => {
                                  if (benchPokemon.attachedEnergy.includes(e)) {
                                    removeEnergy(player, benchPokemon.id, e);
                                  } else {
                                    addEnergy(player, benchPokemon.id, e);
                                  }
                                }}
                              >
                                {e[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="bench-pokemon-actions">
                          <button onClick={() => clearBenchPokemon(player, i)}>✕ Quitar</button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="pick-from-deck-btn small" 
                        onClick={() => {
                          if (deckPokemon.length > 0) {
                            handleSetBench(deckPokemon[0], i);
                          }
                        }}
                      >
                        📋 ({deckPokemon.length})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="pokemon-quick-picker">
              <h6>Pokémon disponibles ({deckPokemon.length})</h6>
              <div className="pokemon-picker-list">
                {deckPokemon.length === 0 ? (
                  <p className="no-pokemon">No hay Pokémon disponibles</p>
                ) : (
                  deckPokemon
                    .filter(p => !filterText || p.name.toLowerCase().includes(filterText.toLowerCase()))
                    .map((pokemon, i) => (
                      <div key={i} className="pokemon-picker-item" onClick={() => {
                        // Find first empty bench slot
                        const emptySlot = playerState.bench.findIndex(p => p === null);
                        if (emptySlot !== -1) {
                          handleSetBench(pokemon, emptySlot);
                        }
                      }}>
                        <span>{pokemon.name}</span>
                        <span className="pokemon-info">{pokemon.stage} {pokemon.hp}HP</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}