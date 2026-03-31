import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { energyTypes, energyColors, parseDeckList } from '../data/decks';
import { PokemonCard } from './PokemonCard';
import { v4 as uuidv4 } from 'uuid';
import type { PokemonInstance, PokemonCard as PokemonCardType, EnergyType, StatusCondition, DeckPreset } from '../types';

interface Props {
  player: 'player1' | 'player2';
  isCurrentPlayer?: boolean;
}

export function BattleField({ player, isCurrentPlayer = false }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCardType | null>(null);
  const [showOpponentHand, setShowOpponentHand] = useState(false);
  
  const gameState = useGameStore(state => state.gameState);
  const setActivePokemon = useGameStore(state => state.setActivePokemon);
  const setBenchPokemon = useGameStore(state => state.setBenchPokemon);
  const updatePokemonHp = useGameStore(state => state.updatePokemonHp);
  const addEnergy = useGameStore(state => state.addEnergy);
  const removeEnergy = useGameStore(state => state.removeEnergy);
  const setStatus = useGameStore(state => state.setStatus);
  const drawCards = useGameStore(state => state.drawCards);
  const setHand = useGameStore(state => state.setHand);
  
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

  const handleToggleEnergy = (id: string, energy: EnergyType, isAttached: boolean) => {
    if (isAttached) {
      removeEnergy(player, id, energy);
    } else {
      addEnergy(player, id, energy);
    }
  };

  const handleStatusChange = (id: string, status: StatusCondition) => {
    setStatus(player, id, status);
  };

  const handleDrawOpponentCards = (count: number) => {
    drawCards('player2', count);
  };

  const handleSetOpponentHand = () => {
    const text = prompt('Pegar lista de cartas para la mano del oponente (una por línea):\nEj:\n4 Dreepy TWM 128\n2 Iono\n3 Psychic Energy');
    if (text) {
      const { pokemon, trainers, energies } = parseDeckList(text);
      const allCards = [
        ...pokemon.map(p => ({ ...p, id: uuidv4() })),
        ...trainers.map(t => ({ type: 'trainer', ...t, id: uuidv4() })),
        ...energies.map(e => ({ type: 'energy', energyType: e.type, quantity: e.quantity, id: uuidv4() })),
      ];
      setHand('player2', allCards);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToBench = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    const cardData = e.dataTransfer.getData('card');
    if (cardData) {
      const card = JSON.parse(cardData);
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
        setBenchPokemon(player, position, instance);
      }
    }
  };

  const handleDropToActive = (e: React.DragEvent) => {
    e.preventDefault();
    const cardData = e.dataTransfer.getData('card');
    if (cardData && !playerState.active) {
      const card = JSON.parse(cardData);
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
        setActivePokemon(player, instance);
      }
    }
  };

  return (
    <div className={`battle-field ${isCurrentPlayer ? 'current' : ''}`}>
      <div className="player-section opponent">
        <h4>🎯 {player === 'player1' ? 'Oponente' : 'Tú'}</h4>
        
        <div className="opponent-hand-section">
          <div className="opponent-hand-header" onClick={() => setShowOpponentHand(!showOpponentHand)}>
            <span>📤 Mano ({opponentState.hand.length})</span>
            <span className="toggle-arrow">{showOpponentHand ? '▼' : '▶'}</span>
          </div>
          {showOpponentHand && (
            <div className="opponent-hand-controls">
              <button onClick={() => handleDrawOpponentCards(1)}>+1</button>
              <button onClick={() => handleDrawOpponentCards(3)}>+3</button>
              <button onClick={handleSetOpponentHand}>Importar</button>
            </div>
          )}
          {showOpponentHand && opponentState.hand.length > 0 && (
            <div className="opponent-hand-cards">
              {opponentState.hand.map((c: any, i) => (
                <div key={i} className="card-item opponent-card">
                  {'hp' in c ? '⚔️' : '🔧'}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="prizes">
          <span className="prize-label">Prizes: {opponentState.prizes.length}</span>
        </div>

        <div className="opponent-active">
          {opponentState.active ? (
            <PokemonCard 
              pokemon={opponentState.active} 
              showDetails
            />
          ) : (
            <div 
              className="empty-slot"
              onDrop={handleDropToActive}
              onDragOver={handleDragOver}
            >
              Arrastra Pokémon
            </div>
          )}
        </div>

        <div className="opponent-bench">
          {[0, 1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className="bench-slot"
              onDrop={(e) => handleDropToBench(e, i)}
              onDragOver={handleDragOver}
            >
              {opponentState.bench[i] ? (
                <PokemonCard pokemon={opponentState.bench[i]!} />
              ) : (
                <div className="empty-slot">+</div>
              )}
            </div>
          ))}
        </div>
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
                    <input
                      type="number"
                      value={playerState.active.currentHp}
                      onChange={e => handleEditHp(playerState.active!.id, parseInt(e.target.value))}
                    />
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
                    <div className="energy-toggles">
                      {energyTypes.slice(0, 6).map(e => (
                        <button
                          key={e}
                          className={`energy-toggle ${playerState.active!.attachedEnergy.includes(e) ? 'attached' : ''}`}
                          style={{ 
                            backgroundColor: playerState.active!.attachedEnergy.includes(e) ? energyColors[e] : undefined 
                          }}
                          onClick={() => handleToggleEnergy(playerState.active!.id, e, playerState.active!.attachedEnergy.includes(e))}
                        >
                          {e[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="close-edit" onClick={() => setEditingId(null)}>✕</button>
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
                  <PokemonCard 
                    pokemon={playerState.bench[i]!} 
                    selected={editingId === playerState.bench[i]!.id}
                  />
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
  const [importText, setImportText] = useState('');
  const initializeGame = useGameStore(state => state.initializeGame);
  const customDecks = useGameStore(state => state.customDecks);
  const addCustomDeck = useGameStore(state => state.addCustomDeck);
  const loadCustomDecks = useGameStore(state => state.loadCustomDecks);
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

  const handleImport = () => {
    if (!importText.trim()) return;
    const { pokemon, trainers, energies } = parseDeckList(importText);
    //console.log('Parsed:', { pokemon: pokemon.length, trainers: trainers.length, energies: energies.length });
    if (pokemon.length > 0) {
      const deckName = prompt('Nombre del mazo:') || 'Mazo Personalizado';
      const newDeck = {
        name: deckName,
        description: 'Mazo importado',
        pokemon,
        trainers,
        energies,
      };
      addCustomDeck(newDeck);
      const pokemonWithIds = pokemon.map(p => ({ ...p, id: uuidv4() }));
      initializeGame(pokemonWithIds, trainers, energies);
      setShowDeck(false);
      setImportText('');
    }
  };
  
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
              <label>Importar nuevo mazo:</label>
              <textarea 
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Pegar deck list..."
                rows={4}
              />
              <button onClick={handleImport} className="import-btn">
                Importar
              </button>
            </div>

            <div className="deck-selection-grid">
              <div className="deck-player-section">
                <h4>🎯 Tu Mazo</h4>
                {player1Deck ? (
                  <div className="selected-deck">
                    <span>{player1Deck.name}</span>
                    <button onClick={() => setPlayer1Deck(null)}>Cambiar</button>
                  </div>
                ) : (
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