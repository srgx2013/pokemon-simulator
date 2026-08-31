import { useState } from 'react';
import { useGameStore, hasActiveGame } from './store/gameStore';
import { BattleField, DeckSelector } from './components/BattleField';
import { ExportPanel } from './components/ExportPanel';
import { ScenarioEditor } from './components/ScenarioEditor';
import { importStateFromJson } from '@pokemon-simulator/core/services/stateImporter';
import { generateImportPrompt, generateLogPrompt } from '@pokemon-simulator/core/services/promptGenerator';

function App() {
  const gameState = useGameStore(state => state.gameState);
  const saveScenario = useGameStore(state => state.saveScenario);
  const loadScenario = useGameStore(state => state.loadScenario);
  const importGameState = useGameStore(state => state.importGameState);
  const resetGame = useGameStore(state => state.resetGame);
  const swapPlayers = useGameStore(state => state.swapPlayers);
  const player1Deck = useGameStore(state => state.player1Deck);
  const player2Deck = useGameStore(state => state.player2Deck);
  const scenarios = useGameStore(state => state.scenarios);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState<'screenshot' | 'log' | null>(null);

  const handleSave = () => {
    const name = prompt('Nombre del escenario:');
    if (name) {
      saveScenario(name);
      alert('Escenario guardado!');
    }
  };

  const handleImport = () => {
    const result = importStateFromJson(importText, { player1: player1Deck, player2: player2Deck });
    if (result.ok) {
      importGameState(result.gameState);
      setImportText('');
      setImportError(null);
      setShowImport(false);
    } else {
      setImportError(result.errors.join('\n'));
    }
  };

  const handleExit = () => {
    if (window.confirm('¿Salir del escenario actual? Si no lo guardaste, se pierde.')) {
      resetGame();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyScreenshotPrompt = async () => {
    await copyToClipboard(generateImportPrompt(player1Deck));
    setPromptCopied('screenshot');
    setTimeout(() => setPromptCopied(null), 2500);
  };

  const handleCopyLogPrompt = async () => {
    await copyToClipboard(generateLogPrompt(player1Deck, player2Deck, 'srgx2013'));
    setPromptCopied('log');
    setTimeout(() => setPromptCopied(null), 2500);
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
          <button className="load-btn" onClick={() => { setImportError(null); setShowImport(true); }}>
            📥 Importar
          </button>
          {hasActiveGame(gameState) && (
            <>
              <button 
                className={`editor-btn ${showEditor ? 'active' : ''}`}
                onClick={() => setShowEditor(!showEditor)}
              >
                ✏️ Editor
              </button>
              <button onClick={handleSave} className="save-btn">💾 Guardar</button>
              <button onClick={() => setShowLoadModal(true)} className="load-btn">📂 Cargar</button>
              <button onClick={swapPlayers} className="load-btn" title="Intercambiar lados (TÚ ⇄ RIVAL)">⇅</button>
              <button onClick={handleExit} className="load-btn">🚪 Salir</button>
            </>
          )}
        </div>
      </header>

      {!hasActiveGame(gameState) ? (
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

      {/* Export Floating Button */}
      {hasActiveGame(gameState) && !showAI && (
        <button className="export-fab" onClick={() => setShowAI(true)} title="Exportar Estado">
          📋
        </button>
      )}

      {showAI && (
        <div className="export-drawer-overlay" onClick={() => setShowAI(false)}>
          <div className="export-drawer" onClick={e => e.stopPropagation()}>
            <button className="export-drawer-close" onClick={() => setShowAI(false)}>✕</button>
            <ExportPanel />
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

      {/* Import modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📥 Importar Escenario</h3>
            <div className="import-prompt-section">
              <p className="import-hint"><strong>Paso 1:</strong> copiá el prompt para tu IA.</p>
              <button className="import-btn" onClick={handleCopyLogPrompt}>
                {promptCopied === 'log' ? '✅ ¡Copiado!' : '📋 Copiar prompt de log (recomendado)'}
              </button>
              <button className="import-btn" onClick={handleCopyScreenshotPrompt}>
                {promptCopied === 'screenshot' ? '✅ ¡Copiado!' : '📷 Copiar prompt de captura'}
              </button>
              <p className="import-hint"><strong>Paso 2:</strong> pegá acá el JSON que te devuelva y cargalo.</p>
            </div>
            <textarea
              className="import-json-textarea"
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={12}
              placeholder={'{\n  "turn": 1,\n  "player1": {}\n}'}
            />
            {importError && <div className="import-error">{importError}</div>}
            <button className="start-game-btn" onClick={handleImport} disabled={!importText.trim()}>
              Cargar escenario
            </button>
            <button className="close-btn" onClick={() => setShowImport(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
