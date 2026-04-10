import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { v4 as uuidv4 } from 'uuid';

type EditingSection = 'prizes' | 'hand' | 'discard' | 'deck' | 'active' | 'bench' | 'all';

interface Props {
  player: 'player1' | 'player2';
}

export function ScenarioEditor({ player }: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [section, setSection] = useState<EditingSection>('all');
  const [newCardText, setNewCardText] = useState('');
  
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
  
  const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
  const playerLabel = player === 'player1' ? 'Tú' : 'Oponente';
  
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
        <button className={section === 'all' ? 'active' : ''} onClick={() => setSection('all')}>Todo</button>
        <button className={section === 'prizes' ? 'active' : ''} onClick={() => setSection('prizes')}>Prizes</button>
        <button className={section === 'hand' ? 'active' : ''} onClick={() => setSection('hand')}>Mano</button>
        <button className={section === 'discard' ? 'active' : ''} onClick={() => setSection('discard')}>Desc.</button>
        <button className={section === 'deck' ? 'active' : ''} onClick={() => setSection('deck')}>Deck</button>
        <button className={section === 'active' ? 'active' : ''} onClick={() => setSection('active')}>Active</button>
        <button className={section === 'bench' ? 'active' : ''} onClick={() => setSection('bench')}>Bench</button>
      </div>
      
      <div className="editor-content">
        {(section === 'all' || section === 'prizes') && (
          <div className="editor-section">
            <h5>🎯 Prizes ({playerState.prizes.length})</h5>
            {renderCardList(playerState.prizes, 'prizes')}
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
            <div className="add-cards">
              <textarea
                value={newCardText}
                onChange={e => setNewCardText(e.target.value)}
                placeholder="Nombre del Pokémon&#10;Ej: Charizard ex"
                rows={2}
              />
              <button onClick={() => handleSetActive(parseCardName(newCardText))}>+ Set Active</button>
            </div>
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
                      <textarea
                        value={newCardText}
                        onChange={e => setNewCardText(e.target.value)}
                        placeholder="Nombre..."
                        className="mini-input"
                      />
                      <button onClick={() => handleSetBench(parseCardName(newCardText), i)}>+</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}