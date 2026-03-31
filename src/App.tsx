import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { BattleField, DeckSelector } from './components/BattleField';
import { AIPanel } from './components/AIPanel';
import { deckPresets } from './data/decks';

function App() {
  const gameState = useGameStore(state => state.gameState);
  const saveScenario = useGameStore(state => state.saveScenario);
  const loadScenario = useGameStore(state => state.loadScenario);
  const scenarios = useGameStore(state => state.scenarios);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const playerDeck = gameState.player1.deck.filter((c): c is any => c && typeof c === 'object' && 'hp' in c);
  
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
        <aside className="left-panel">
          <h3>Cartas del Mazo ({playerDeck.length})</h3>
          <div className="card-list">
            {playerDeck.length > 0 ? (
              playerDeck.map((p, i) => (
                <div key={`${p.name}-${i}`} className="card-item">
                  <span className={`rarity ${p.rarity}`}>{p.rarity?.[0]?.toUpperCase() || 'C'}</span>
                  <span>{p.name}</span>
                  <span className="hp">{p.hp} HP</span>
                </div>
              ))
            ) : (
              deckPresets.flatMap(d => 
                d.pokemon.map((p, i) => (
                  <div key={`${d.name}-${p.name}-${i}`} className="card-item">
                    <span className={`rarity ${p.rarity}`}>{p.rarity[0].toUpperCase()}</span>
                    <span>{p.name}</span>
                    <span className="hp">{p.hp} HP</span>
                  </div>
                ))
              )
            )}
          </div>
        </aside>

        <section className="center-panel">
          <BattleField player="player1" isCurrentPlayer={gameState.currentPlayer === 'player1'} />
        </section>

        <aside className="right-panel">
          <AIPanel />
        </aside>
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