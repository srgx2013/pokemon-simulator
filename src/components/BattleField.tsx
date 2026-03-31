import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { deckPresets, energyTypes, energyColors, parseDeckList } from '../data/decks';
import { PokemonCard } from './PokemonCard';
import { v4 as uuidv4 } from 'uuid';
import type { PokemonInstance, PokemonCard as PokemonCardType, EnergyType, StatusCondition } from '../types';

interface Props {
  player: 'player1' | 'player2';
  isCurrentPlayer?: boolean;
}

export function BattleField({ player, isCurrentPlayer = false }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCardType | null>(null);
  
  const gameState = useGameStore(state => state.gameState);
  const setActivePokemon = useGameStore(state => state.setActivePokemon);
  const setBenchPokemon = useGameStore(state => state.setBenchPokemon);
  const updatePokemonHp = useGameStore(state => state.updatePokemonHp);
  const addEnergy = useGameStore(state => state.addEnergy);
  const removeEnergy = useGameStore(state => state.removeEnergy);
  const setStatus = useGameStore(state => state.setStatus);
  
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

  return (
    <div className={`battle-field ${isCurrentPlayer ? 'current' : ''}`}>
      <div className="player-section opponent">
        <h4>🎯 {player === 'player1' ? 'Oponente' : 'Tú'}</h4>
        
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
            <div className="empty-slot">Sin Pokémon activo</div>
          )}
        </div>

        <div className="opponent-bench">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="bench-slot">
              {opponentState.bench[i] ? (
                <PokemonCard pokemon={opponentState.bench[i]!} />
              ) : (
                <div className="empty-slot">Bench {i + 1}</div>
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
            <div className="empty-slot active-slot">Arrastra un Pokémon aquí</div>
          )}
        </div>

        <div className="your-bench">
          <h5>Bench (máx 5)</h5>
          <div className="bench-grid">
            {[0, 1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className="bench-slot"
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
  
  const handleSelectDeck = (deckName: string) => {
    const deck = deckPresets.find(d => d.name === deckName);
    if (deck) {
      const pokemonWithIds = deck.pokemon.map(p => ({ ...p, id: uuidv4() }));
      initializeGame(pokemonWithIds, deck.trainers, deck.energies);
      setShowDeck(false);
    }
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const { pokemon, trainers, energies } = parseDeckList(importText);
    if (pokemon.length > 0) {
      const pokemonWithIds = pokemon.map(p => ({ ...p, id: uuidv4() }));
      initializeGame(pokemonWithIds, trainers, energies);
      setShowDeck(false);
      setImportText('');
    }
  };
  
  return (
    <div className="deck-selector">
      <button className="select-deck-btn" onClick={() => setShowDeck(true)}>
        🎴 Nueva Partida
      </button>
      
      {showDeck && (
        <div className="deck-modal">
          <div className="modal-content">
            <h3>Importar / Seleccionar Mazo</h3>
            
            <div className="import-section">
              <label>Pegar deck list:</label>
              <textarea 
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="4 Dreepy (TWM-128)&#10;3 Dragapult ex (TWM-130)"
                rows={6}
              />
              <button onClick={handleImport} className="import-btn">
                Importar Deck
              </button>
            </div>

            <div className="deck-divider">o seleccionar preset:</div>
            
            <div className="deck-list">
              {deckPresets.map(deck => (
                <button 
                  key={deck.name}
                  className="deck-option"
                  onClick={() => handleSelectDeck(deck.name)}
                >
                  <span className="deck-name">{deck.name}</span>
                  <span className="deck-desc">{deck.description}</span>
                </button>
              ))}
            </div>
            <button className="close-btn" onClick={() => setShowDeck(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}