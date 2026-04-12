import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { BattleField, DeckSelector } from './components/BattleField';
import { AIPanel } from './components/AIPanel';
import { ScenarioEditor } from './components/ScenarioEditor';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const gameState = useGameStore(state => state.gameState);
  const saveScenario = useGameStore(state => state.saveScenario);
  const loadScenario = useGameStore(state => state.loadScenario);
  const scenarios = useGameStore(state => state.scenarios);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Player 1 (Tú)
  const playerDeck = gameState.player1.deck.filter((c): c is any => c && typeof c === 'object' && 'hp' in c);
  const playerTrainers = gameState.player1.deck.filter((c): c is any => c && typeof c === 'object' && !('hp' in c) && (c as any).type !== 'energy');
  const playerEnergies = gameState.player1.deck.filter((c): c is any => c && typeof c === 'object' && ((c as any).type === 'energy' || (c as any).energyType));
  const playerPrizes = gameState.player1.prizes;
  const playerHand = gameState.player1.hand;
  const playerDiscard = gameState.player1.discardPile;
  
  // Player 2 (Oponente)
  const opponentDeck = gameState.player2.deck;
  const opponentPrizes = gameState.player2.prizes;
  const opponentHand = gameState.player2.hand;
  const opponentDiscard = gameState.player2.discardPile;
  
  const drawCards = useGameStore(state => state.drawCards);
  const addToHand = useGameStore(state => state.addToHand);
  
  const handleDrawCards = (count: number) => {
    drawCards('player1', count);
  };
  
  const handleDragStart = (e: React.DragEvent, card: any, index: number) => {
    e.dataTransfer.setData('card', JSON.stringify(card));
    e.dataTransfer.setData('fromHand', 'player1');
    e.dataTransfer.setData('fromPlayer', 'player1');
    e.dataTransfer.setData('handIndex', index.toString());
  };
  
  // Drag from opponent hand
  const handleDragStartOpponent = (e: React.DragEvent, card: any, index: number) => {
    e.dataTransfer.setData('card', JSON.stringify(card));
    e.dataTransfer.setData('fromHand', 'opponent');
    e.dataTransfer.setData('fromPlayer', 'player2');
    e.dataTransfer.setData('handIndex', index.toString());
  };
  
  const handleDropToHand = (e: React.DragEvent) => {
    e.preventDefault();
    const cardData = e.dataTransfer.getData('card');
    if (cardData) {
      const card = JSON.parse(cardData);
      // If card already has an id (from active/bench), preserve it; otherwise create new one
      const existingId = card.card?.id || card.id;
      const cardWithId = { ...card, id: existingId || uuidv4() };
      addToHand('player1', [cardWithId]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleSave = () => {
    const name = prompt('Nombre del escenario:');
    if (name) {
      saveScenario(name);
      alert('Escenario guardado!');
    }
  };
  
  const handleMulligan = (player: 'player1' | 'player2') => {
    const storeMulligan = useGameStore.getState().processMulligan;
    storeMulligan(player);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🃏 Pokemon Battle Simulator</h1>
        <div className="header-actions">
          <DeckSelector />
          <button onClick={handleSave} className="save-btn">💾 Guardar</button>
          <button onClick={() => setShowLoadModal(true)} className="load-btn">📂 Cargar</button>
        </div>
      </header>

      <main className="main">
        {/* PRIZES - Ambos jugadores */}
        <div className="prizes-section">
          <div className="prizes-player">
            <span className="prizes-label">🎯 Tus Prizes</span>
            <div className="prizes-cards">
              {playerPrizes.length > 0 ? (
                playerPrizes.slice(0, 6).map((_: any, i) => (
                  <div key={i} className="prize-card-face-down">★</div>
                ))
              ) : (
                <>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="prize-card-empty"></div>
                  ))}
                </>
              )}
            </div>
            <span className="prize-count">{playerPrizes.length}/6</span>
          </div>
          
          <div className="prizes-center">
            <span className="vs-badge">VS</span>
          </div>
          
          <div className="prizes-player opponent">
            <span className="prizes-label">⚔️ Prizes Rival</span>
            <div className="prizes-cards">
              {opponentPrizes.length > 0 ? (
                opponentPrizes.slice(0, 6).map((_: any, i) => (
                  <div key={i} className="prize-card-face-down">★</div>
                ))
              ) : (
                <>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="prize-card-empty"></div>
                  ))}
                </>
              )}
            </div>
            <span className="prize-count">{opponentPrizes.length}/6</span>
          </div>
        </div>

        {/* PLAY AREA - Deck, Play Zone, Discard */}
        <div className="play-area">
          {/* PLAYER 1 ZONE */}
          <div className="player-zone">
            {/* Deck */}
            <div className="zone-column deck-zone">
              <div className="zone-header">📚 DECK</div>
              <div className="deck-count">
                <span className="count-number">{playerDeck.length + playerTrainers.length + playerEnergies.length}</span>
                <span className="count-label">cartas</span>
              </div>
              <div className="deck-actions">
                <button onClick={() => handleDrawCards(1)}>+1</button>
                <button onClick={() => handleDrawCards(3)}>+3</button>
              </div>
            </div>

            {/* Hand */}
            <div className="zone-column hand-zone">
              <div className="zone-header">🃏 MANO</div>
              <div 
                className="hand-cards drop-zone"
                onDrop={handleDropToHand}
                onDragOver={handleDragOver}
              >
                {playerHand.length > 0 ? (
                  playerHand.map((c: any, i) => (
                    <div key={i} className="hand-card" draggable onDragStart={(e) => handleDragStart(e, c, i)}>
                      {'hp' in c ? (
                        <>
                          <span className="card-type-indicator pokemon-type"></span>
                          <span className="card-name-full">{c.name}</span>
                          <span className="card-hp">{c.hp}HP</span>
                        </>
                      ) : 'energyType' in c ? (
                        <span className="card-name-full energy-type">{c.energyType || c.type}</span>
                      ) : (
                        <span className="card-name-full trainer-type">{c.name}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-zone">Sin cartas</div>
                )}
              </div>
              <span className="hand-count">{playerHand.length} cartas</span>
              {/* Mulligan button - below hand count */}
              {playerHand.length > 0 && (
                <button className="mulligan-btn" onClick={() => handleMulligan('player1')}>
                  🔄 Mulligan
                </button>
              )}
              <ScenarioEditor player="player1" />
            </div>

            {/* Discard */}
            <div className="zone-column discard-zone">
              <div className="zone-header">🗑️ DISCARD</div>
              <div className="discard-count">
                <span className="count-number">{playerDiscard.length}</span>
              </div>
              <div className="discard-preview">
                {playerDiscard.slice(-3).reverse().map((c: any, i) => (
                  <div key={i} className="discard-card">
                    {'hp' in c ? c.name?.slice(0, 8) : '⚡'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER - Battle Field */}
          <div className="center-area">
            <BattleField player="player1" isCurrentPlayer={gameState.currentPlayer === 'player1'} />
            <AIPanel />
          </div>

          {/* PLAYER 2 ZONE (Oponente) */}
          <div className="player-zone opponent">
            {/* Deck */}
            <div className="zone-column deck-zone">
              <div className="zone-header">📚 DECK</div>
              <div className="deck-count">
                <span className="count-number">{opponentDeck.length}</span>
                <span className="count-label">cartas</span>
              </div>
            </div>

            {/* Hand */}
            <div className="zone-column hand-zone">
              <div className="zone-header">🃏 MANO</div>
              <div className="hand-cards opponent-hand">
                {opponentHand.length > 0 ? (
                  opponentHand.map((c: any, i) => (
                    <div 
                      key={i} 
                      className="hand-card opponent-card draggable"
                      draggable
                      onDragStart={(e) => handleDragStartOpponent(e, c, i)}
                    >
                      {'hp' in c ? (
                        <>
                          <span className="card-type-indicator opponent-type"></span>
                          <span className="card-name-full opponent-name">{c.name}</span>
                          <span className="card-hp opponent-hp">{c.hp}HP</span>
                        </>
                      ) : 'energyType' in c ? (
                        <span className="card-name-full energy-type">{c.energyType || c.type}</span>
                      ) : (
                        <span className="card-name-full trainer-type">{c.name}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-zone">-</div>
                )}
              </div>
              <span className="hand-count">{opponentHand.length}</span>
              {/* Mulligan button for opponent - below hand count */}
              {opponentHand.length > 0 && (
                <button className="mulligan-btn" onClick={() => handleMulligan('player2')}>
                  🔄 Mulligan
                </button>
              )}
              <ScenarioEditor player="player2" />
            </div>

            {/* Discard */}
            <div className="zone-column discard-zone">
              <div className="zone-header">🗑️ DISCARD</div>
              <div className="discard-count">
                <span className="count-number">{opponentDiscard.length}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Cargar Escenario</h3>
            {scenarios.length === 0 ? (
              <p>No hay escenarios guardados</p>
            ) : (
              <div className="scenario-list">
                {scenarios.map(s => (
                  <button key={s.id} onClick={() => { loadScenario(s.id); setShowLoadModal(false); }}>
                    {s.name} - {new Date(s.createdAt).toLocaleDateString()}
                  </button>
                ))}
              </div>
            )}
            <button className="close-btn" onClick={() => setShowLoadModal(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;