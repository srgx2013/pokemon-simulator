import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { v4 as uuidv4 } from 'uuid';

type EditingSection = 'prizes' | 'hand' | 'discard' | 'deck' | 'active' | 'bench' | 'picker' | 'all';

interface Props {
  player: 'player1' | 'player2';
}

export function ScenarioEditor({ player }: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [section, setSection] = useState<EditingSection>('all');
  const [newCardText, setNewCardText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [pokemonPickerTarget, setPokemonPickerTarget] = useState<{type: 'active' | 'bench', position?: number} | null>(null);
  const [cardPickerTarget, setCardPickerTarget] = useState<'hand' | 'prizes' | 'discard' | 'deck' | null>(null);
  
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
  const player1Deck = useGameStore(state => state.player1Deck);
  const player2Deck = useGameStore(state => state.player2Deck);
  
  const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
  const playerLabel = player === 'player1' ? 'Tú' : 'Oponente';
  const selectedDeck = player === 'player1' ? player1Deck : player2Deck;
  
  // Get only pokemon from the selected deck
  const deckPokemon = selectedDeck ? selectedDeck.pokemon : [];
  
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
  
  // Get available cards from the selected deck
  const availableCards = selectedDeck 
    ? [
        ...selectedDeck.pokemon.map(c => ({ ...c, category: 'pokemon' })),
        ...selectedDeck.trainers.map(c => ({ ...c, category: 'trainer' })),
        ...(selectedDeck.energies || []).flatMap(e => 
          Array(e.quantity).fill({ name: e.type + ' Energy', type: 'energy', energyType: e.type, category: 'energy' })
        ),
      ]
    : [];
  
  const addCardFromPicker = (card: any, target: 'hand' | 'discard' | 'prizes' | 'deck') => {
    const cardWithId = { ...card, id: uuidv4() };
    addCards([cardWithId], target);
    setCardPickerTarget(null);
    setFilterText('');
  };
  
  const openCardPicker = (target: 'hand' | 'prizes' | 'discard' | 'deck') => {
    setCardPickerTarget(target);
    setFilterText('');
  };
  
  const parseCardName = (text: string) => {
    // Simple parser for card text - could be enhanced
    const name = text.trim();
    return { name, hp: 100, stage: 'basic', type: 'psychic' as const, attacks: [], retreatCost: 1, rarity: 'common' as const };
  };
  
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
  
  const handleAddCards = (target: 'hand' | 'discard' | 'prizes' | 'deck') => {
    if (!newCardText.trim()) return;
    const cardNames = newCardText.split('\n').filter(line => line.trim());
    const cards = cardNames.map(name => ({ ...parseCardName(name), id: uuidv4() }));
    addCards(cards, target);
    setNewCardText('');
  };
  
  const handleRemoveCard = (target: 'hand' | 'discard' | 'prizes' | 'deck', index: number) => {
    const playerObj = player === 'player1' ? 'player1' : 'player2';
    switch (target) {
      case 'hand':
        setHand(playerObj, playerState.hand.filter((_, i) => i !== index));
        break;
      case 'discard':
        setDiscard(playerObj, playerState.discardPile.filter((_, i) => i !== index));
        break;
      case 'prizes':
        setPrizes(playerObj, playerState.prizes.filter((_, i) => i !== index));
        break;
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
    setPokemonPickerTarget(null);
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
    setPokemonPickerTarget(null);
  };
  
  const openPokemonPicker = (type: 'active' | 'bench', position?: number) => {
    setPokemonPickerTarget({ type, position });
    setFilterText('');
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
        <button onClick={() => setShowEditor(false)} className="close-btn">✕</button>
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
            <button className="pick-from-deck-btn" onClick={() => openCardPicker('prizes')}>
              📋 Elegir del Deck
            </button>
            <div className="add-cards">
              <textarea
                value={newCardText}
                onChange={e => setNewCardText(e.target.value)}
                placeholder="Agregar cartas (una por línea)&#10;Ej: Charizard ex"
                rows={3}
              />
              <button onClick={() => handleAddCards('prizes')}>+ Agregar</button>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'hand') && (
          <div className="editor-section">
            <h5>🃏 Mano ({playerState.hand.length})</h5>
            {renderCardList(playerState.hand, 'hand')}
            <button className="pick-from-deck-btn" onClick={() => openCardPicker('hand')}>
              📋 Elegir del Deck
            </button>
            <div className="add-cards">
              <textarea
                value={newCardText}
                onChange={e => setNewCardText(e.target.value)}
                placeholder="Agregar cartas (una por línea)"
                rows={3}
              />
              <button onClick={() => handleAddCards('hand')}>+ Agregar</button>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'discard') && (
          <div className="editor-section">
            <h5>🗑️ Descarte ({playerState.discardPile.length})</h5>
            {renderCardList(playerState.discardPile, 'discard')}
            <button className="pick-from-deck-btn" onClick={() => openCardPicker('discard')}>
              📋 Elegir del Deck
            </button>
            <div className="add-cards">
              <textarea
                value={newCardText}
                onChange={e => setNewCardText(e.target.value)}
                placeholder="Agregar cartas (una por línea)"
                rows={3}
              />
              <button onClick={() => handleAddCards('discard')}>+ Agregar</button>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'deck') && (
          <div className="editor-section">
            <h5>📚 Deck ({playerState.deck.length})</h5>
            {renderDeckList(playerState.deck)}
            <button className="pick-from-deck-btn" onClick={() => openCardPicker('deck')}>
              📋 Elegir del Deck
            </button>
            <div className="add-cards">
              <textarea
                value={newCardText}
                onChange={e => setNewCardText(e.target.value)}
                placeholder="Agregar cartas (una por línea)"
                rows={3}
              />
              <button onClick={() => handleAddCards('deck')}>+ Agregar</button>
            </div>
          </div>
        )}
        
        {(section === 'all' || section === 'active') && (
          <div className="editor-section">
            <h5>🔥 Active</h5>
            {playerState.active ? (
              <div className="pokemon-editable">
                <span className="pokemon-name">{playerState.active.card.name}</span>
                <span className="pokemon-hp">{playerState.active.currentHp}/{playerState.active.card.hp} HP</span>
                <div className="pokemon-controls">
                  <button onClick={() => updatePokemonHp(player, playerState.active!.id, playerState.active!.currentHp - 10)}>-10</button>
                  <button onClick={() => updatePokemonHp(player, playerState.active!.id, playerState.active!.currentHp - 20)}>-20</button>
                  <button onClick={() => updatePokemonHp(player, playerState.active!.id, playerState.active!.currentHp + 10)}>+10</button>
                  <button onClick={() => updatePokemonHp(player, playerState.active!.id, playerState.active!.currentHp + 20)}>+20</button>
                </div>
                <div className="status-select">
                  <select
                    value={playerState.active.status}
                    onChange={e => setStatus(player, playerState.active!.id, e.target.value as any)}
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
                <button className="remove-active-btn" onClick={() => clearActivePokemon(player)}>
                  🗑️ Quitar Active
                </button>
              </div>
            ) : (
              <div className="empty-active">Sin Pokémon activo</div>
            )}
            <button className="pick-from-deck-btn" onClick={() => openPokemonPicker('active')}>
              📋 Elegir del Deck
            </button>
            <div className="add-cards">
              <textarea
                value={newCardText}
                onChange={e => setNewCardText(e.target.value)}
                placeholder="Nombre del Pokémon"
                rows={2}
              />
              <button onClick={() => handleSetActive(parseCardName(newCardText))}>+</button>
            </div>
            {pokemonPickerTarget?.type === 'active' && (
              <div className="pokemon-picker-modal">
                <h5>Seleccionar Pokémon del Deck</h5>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="card-filter-input"
                />
                <div className="pokemon-picker-list">
                  {deckPokemon
                    .filter(p => !filterText || p.name.toLowerCase().includes(filterText.toLowerCase()))
                    .map((pokemon, i) => (
                      <div key={i} className="pokemon-picker-item" onClick={() => handleSetActive(pokemon)}>
                        <span>{pokemon.name}</span>
                        <span className="pokemon-info">{pokemon.stage} {pokemon.hp}HP</span>
                      </div>
                    ))}
                </div>
                <button className="close-picker-btn" onClick={() => setPokemonPickerTarget(null)}>✕ Cerrar</button>
              </div>
            )}
          </div>
        )}
        
        {(section === 'all' || section === 'bench') && (
          <div className="editor-section">
            <h5>🪑 Bench</h5>
            <div className="bench-slots-editor">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="bench-slot-editor">
                  <span className="slot-number">#{i + 1}</span>
                  {playerState.bench[i] ? (
                    <div className="pokemon-mini">
                      <span>{playerState.bench[i]!.card.name}</span>
                      <span>{playerState.bench[i]!.currentHp}/{playerState.bench[i]!.card.hp}</span>
                      <button onClick={() => clearBenchPokemon(player, i)}>✕</button>
                    </div>
                  ) : (
                    <div className="empty-slot">
                      <button className="pick-from-deck-btn small" onClick={() => openPokemonPicker('bench', i)}>
                        📋
                      </button>
                      <button onClick={() => handleSetBench(parseCardName(newCardText), i)}>+</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {pokemonPickerTarget?.type === 'bench' && (
              <div className="pokemon-picker-modal">
                <h5>Seleccionar Pokémon - Bench #{pokemonPickerTarget.position! + 1}</h5>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="card-filter-input"
                />
                <div className="pokemon-picker-list">
                  {deckPokemon
                    .filter(p => !filterText || p.name.toLowerCase().includes(filterText.toLowerCase()))
                    .map((pokemon, i) => (
                      <div key={i} className="pokemon-picker-item" onClick={() => handleSetBench(pokemon, pokemonPickerTarget.position!)}>
                        <span>{pokemon.name}</span>
                        <span className="pokemon-info">{pokemon.stage} {pokemon.hp}HP</span>
                      </div>
                    ))}
                </div>
                <button className="close-picker-btn" onClick={() => setPokemonPickerTarget(null)}>✕ Cerrar</button>
              </div>
            )}
          </div>
        )}
        
        {/* Card Picker Modal - for hand, prizes, discard, deck */}
        {cardPickerTarget && (
          <div className="card-picker-modal-wide">
            <h5>
              📋 Elegir Carta - {cardPickerTarget === 'hand' ? 'Mano' : 
              cardPickerTarget === 'prizes' ? 'Prizes' : 
              cardPickerTarget === 'discard' ? 'Descarte' : 'Deck'}
            </h5>
            <input
              type="text"
              placeholder="Buscar carta..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="card-filter-input"
            />
            <div className="card-picker-list">
              {deckCards
                .filter(c => !filterText || c.name.toLowerCase().includes(filterText.toLowerCase()))
                .map((card, i) => (
                  <div key={i} className="card-picker-option" onClick={() => addCardFromPicker(card, cardPickerTarget)}>
                    <span className="card-picker-name">{card.name}</span>
                    <span className="card-picker-type">{card.category || 'pokemon'}</span>
                  </div>
                ))}
            </div>
            <button className="close-picker-btn" onClick={() => setCardPickerTarget(null)}>✕ Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}