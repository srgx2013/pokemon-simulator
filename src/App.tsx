import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { BattleField, DeckSelector } from './components/BattleField';
import { AIPanel } from './components/AIPanel';
import { energyColors } from './data/decks';
import type { EnergyType } from './types';
import { v4 as uuidv4 } from 'uuid';

const getEnergyColor = (type: string): string => {
  return energyColors[type as EnergyType] || '#888';
};

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
  
  // Player 2 (Oponente)
  const opponentDeck = gameState.player2.deck.filter((c): c is any => c && typeof c === 'object' && 'hp' in c);
  const opponentTrainers = gameState.player2.deck.filter((c): c is any => c && typeof c === 'object' && !('hp' in c) && (c as any).type !== 'energy');
  const opponentEnergies = gameState.player2.deck.filter((c): c is any => c && typeof c === 'object' && ((c as any).type === 'energy' || (c as any).energyType));
  const opponentPrizes = gameState.player2.prizes;
  const opponentHand = gameState.player2.hand;
  
  const drawCards = useGameStore(state => state.drawCards);
  const addToHand = useGameStore(state => state.addToHand);
  
  const handleDrawCards = (count: number) => {
    drawCards('player1', count);
  };
  
  const handleDragStart = (e: React.DragEvent, card: any) => {
    e.dataTransfer.setData('card', JSON.stringify(card));
  };
  
  const handleDropToHand = (e: React.DragEvent) => {
    e.preventDefault();
    const cardData = e.dataTransfer.getData('card');
    if (cardData) {
      const card = JSON.parse(cardData);
      const cardWithId = { ...card, id: uuidv4() };
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
        <div className="decks-container">
          <aside className="left-panel player1-panel">
            <h2>🎯 Jugador 1 (Tú)</h2>
            <div className="deck-sections">
              <section className="deck-section">
                <h3>Pokemon ({playerDeck.length})</h3>
                <div className="card-list">
                  {playerDeck.length > 0 ? (
                    playerDeck.map((p, i) => (
                      <div 
                        key={`p1-poke-${i}`} 
                        className="card-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, p)}
                      >
                        <span className={`rarity ${p.rarity}`}>{p.rarity?.[0]?.toUpperCase() || 'C'}</span>
                        <span>{p.name}</span>
                        <span className="hp">{p.hp} HP</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin cartas</div>
                  )}
                </div>
              </section>

              <section className="deck-section">
                <h3>Trainers ({playerTrainers.length})</h3>
                <div className="card-list">
                  {playerTrainers.length > 0 ? (
                    playerTrainers.map((t, i) => (
                      <div 
                        key={`p1-trainer-${i}`} 
                        className="card-item trainer-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, t)}
                      >
                        <span className={`card-type ${t.type}`}>{t.type?.[0]?.toUpperCase() || 'T'}</span>
                        <span>{t.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin trainers</div>
                  )}
                </div>
              </section>

              <section className="deck-section">
                <h3>Energies ({playerEnergies.length})</h3>
                <div className="card-list">
                  {playerEnergies.length > 0 ? (
                    playerEnergies.map((e: any, i) => (
                      <div 
                        key={`p1-energy-${i}`} 
                        className="card-item energy-card"
                        draggable
                        onDragStart={(ev) => handleDragStart(ev, { type: 'energy', energyType: e.energyType || e.type })}
                      >
                        <span className="energy-dot" style={{ background: getEnergyColor(e.energyType || e.type) }}></span>
                        <span>{e.energyType || e.type}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin energias</div>
                  )}
                </div>
              </section>

              <section className="deck-section">
                <h3>Prizes ({playerPrizes.length})</h3>
                <div className="card-list">
                  {playerPrizes.length > 0 ? (
                    playerPrizes.map((c: any, i) => (
                      <div key={`p1-prize-${i}`} className="card-item">
                        {'hp' in c ? <span>{c.name}</span> : <span>⚡</span>}
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin prizes</div>
                  )}
                </div>
              </section>

              <section className="deck-section">
                <h3>Mano ({playerHand.length})</h3>
                <div 
                  className="hand-controls"
                  onDrop={handleDropToHand}
                  onDragOver={handleDragOver}
                >
                  <button onClick={() => handleDrawCards(1)}>+1</button>
                  <button onClick={() => handleDrawCards(3)}>+3</button>
                </div>
                <div 
                  className="card-list drop-zone"
                  onDrop={handleDropToHand}
                  onDragOver={handleDragOver}
                >
                  {playerHand.length > 0 ? (
                    playerHand.map((c: any, i) => (
                      <div key={`p1-hand-${i}`} className="card-item">
                        {'hp' in c ? <span>{c.name}</span> : 'energyType' in c ? <span>⚡</span> : <span>🔧</span>}
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin mano</div>
                  )}
                </div>
              </section>
            </div>
          </aside>

          <aside className="right-panel player2-panel">
            <h2>⚔️ Jugador 2 (Oponente)</h2>
            <div className="deck-sections">
              <section className="deck-section">
                <h3>Deck ({opponentDeck.length + opponentTrainers.length + opponentEnergies.length})</h3>
                <div className="card-list">
                  <div className="no-cards">{opponentDeck.length} Pokemon, {opponentTrainers.length} Trainers, {opponentEnergies.length} Energies</div>
                </div>
              </section>

              <section className="deck-section">
                <h3>Prizes ({opponentPrizes.length})</h3>
                <div className="card-list">
                  {opponentPrizes.length > 0 ? (
                    opponentPrizes.map((c: any, i) => (
                      <div key={`p2-prize-${i}`} className="card-item">
                        {'hp' in c ? <span>{c.name}</span> : <span>⚡</span>}
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin prizes</div>
                  )}
                </div>
              </section>

              <section className="deck-section">
                <h3>Mano ({opponentHand.length})</h3>
                <div className="card-list">
                  {opponentHand.length > 0 ? (
                    opponentHand.map((_: any, i) => (
                      <div key={`p2-hand-${i}`} className="card-item opponent-card">
                        <span>🃏</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-cards">Sin mano</div>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>

        <div className="center-area">
          <BattleField player="player1" isCurrentPlayer={gameState.currentPlayer === 'player1'} />
          <AIPanel />
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