import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { BattleField, DeckSelector } from './components/BattleField';
import { AIPanel } from './components/AIPanel';
import { ScenarioEditor } from './components/ScenarioEditor';

function App() {
  const gameState = useGameStore(state => state.gameState);
  const saveScenario = useGameStore(state => state.saveScenario);
  const loadScenario = useGameStore(state => state.loadScenario);
  const scenarios = useGameStore(state => state.scenarios);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showAI, setShowAI] = useState(false);

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
        <div className="header-title-group">
          <h1>🃏 Pokemon TCG — Board Editor</h1>
          <span className="header-subtitle">Configurá escenarios como en el juego físico</span>
        </div>
        <div className="header-actions">
          <DeckSelector />
          {gameState.player1.deck.length > 0 && (
            <>
              <button 
                className={`editor-btn ${showEditor ? 'active' : ''}`}
                onClick={() => setShowEditor(!showEditor)}
              >
                ✏️ Editor
              </button>
              <button onClick={handleSave} className="save-btn">💾 Guardar</button>
              <button onClick={() => setShowLoadModal(true)} className="load-btn">📂 Cargar</button>
            </>
          )}
        </div>
      </header>

      {gameState.player1.deck.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <h2>Bienvenido al Board Editor</h2>
            <p>Seleccioná un mazo para cada jugador y comenzá a configurar escenarios.</p>
            <DeckSelector />
          </div>
        </div>
      ) : (
        <main className="main">
          <BattleField player="player1" />
        </main>
      )}

      {/* AI Floating Button */}
      {gameState.player1.deck.length > 0 && !showAI && (
        <button className="ai-fab" onClick={() => setShowAI(true)} title="AI Analysis">
          🤖
        </button>
      )}

      {showAI && (
        <div className="ai-drawer-overlay" onClick={() => setShowAI(false)}>
          <div className="ai-drawer" onClick={e => e.stopPropagation()}>
            <button className="ai-drawer-close" onClick={() => setShowAI(false)}>✕</button>
            <AIPanel />
          </div>
        </div>
      )}

      {/* ScenarioEditor toggle */}
      {showEditor && (
        <ScenarioEditor player="player1" />
      )}

      {/* Load modal */}
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
