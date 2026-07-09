import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { MoveRecommendation } from '../types';

interface AIResponse {
  analysis: string;
  recommendations: MoveRecommendation[];
  odds: {
    win: number;
    lose: number;
  };
}

export function AIPanel() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'export' | 'analysis' | 'external'>('export');
  const [copied, setCopied] = useState(false);

  const getStateForAI = useGameStore(state => state.getStateForAI);
  const gameState = useGameStore(state => state.gameState);

  const copyStateToClipboard = useCallback(async () => {
    const stateText = getStateForAI();

    try {
      await navigator.clipboard.writeText(stateText);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = stateText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    return stateText;
  }, [getStateForAI]);

  const analyzeWithHF = async () => {
    const stateText = await copyStateToClipboard();

    if (!apiKey) return;

    setLoading(true);

    const prompt = `You are an expert Pokémon TCG player. Analyze the current game state and provide strategic advice.

CURRENT GAME STATE:
${stateText}

Based on this state:
1. Analyze the current situation (who is ahead, what are the threats)
2. Provide 3-5 recommended moves ranked by expected value (EV)
3. Estimate win probability for the current player
4. Explain why each recommendation is good

Format your response as:
---
ANALYSIS: [Your analysis of the current game state]
---
RECOMMENDATIONS:
1. [Move name]: [Why it's good]
2. [Move name]: [Why it's good]
...
---
WIN PROBABILITY: [X]% - [Explain briefly]
---
ODDS: Win: X% | Lose: Y% | Draw: Z%
---
`;

    try {
      const res = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an expert Pokémon TCG strategist. Provide clear, actionable advice for the current game state.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.error || 'No response';

      const analysisMatch = text.match(/ANALYSIS:\s*(.*?)(?=---|$)/s);
      const recMatch = text.match(/RECOMMENDATIONS:\s*(.*?)(?=---|$)/s);
      const oddsMatch = text.match(/ODDS:\s*Win:\s*(\d+)%\s*\|\s*Lose:\s*(\d+)%/);

      const recommendations: MoveRecommendation[] = [];
      if (recMatch) {
        const lines = recMatch[1].trim().split('\n').filter((l: string) => l.trim());
        lines.forEach((line: string, i: number) => {
          const match = line.match(/^\d+\.\s*(.+?):\s*(.+)$/);
          if (match) {
            recommendations.push({
              id: `rec-${i}`,
              move: match[1].trim(),
              reason: match[2].trim(),
              ev: Math.max(100 - i * 15, 50),
            });
          }
        });
      }

      setResponse({
        analysis: analysisMatch?.[1]?.trim() || 'Analysis not available',
        recommendations: recommendations.length > 0 ? recommendations : [
          { id: '1', move: 'Attack with active Pokemon', reason: 'Standard aggressive line', ev: 80 },
          { id: '2', move: 'Evolve bench Pokemon', reason: 'Build pressure for next turn', ev: 65 },
          { id: '3', move: 'Play trainer card', reason: 'Seek specific cards', ev: 50 },
        ],
        odds: {
          win: oddsMatch ? parseInt(oddsMatch[1]) : 50,
          lose: oddsMatch ? parseInt(oddsMatch[2]) : 50,
        },
      });
    } catch (error) {
      console.error('API Error:', error);
      setResponse({
        analysis: 'Error connecting to AI. Check your API key.',
        recommendations: [],
        odds: { win: 50, lose: 50 },
      });
    }

    setLoading(false);
  };

  const quickAnalysis = () => {
    const { player1, player2 } = gameState;

    return (
      <div className="quick-analysis">
        <QuickStat label="Activo Tú" value={player1.active ? `${player1.active.card.name} (${player1.active.currentHp}/${player1.active.card.hp} HP)` : '—'} />
        <QuickStat label="Activo Rival" value={player2.active ? `${player2.active.card.name} (${player2.active.currentHp}/${player2.active.card.hp} HP)` : '—'} />
        <QuickStat label="Bench Tú" value={`${player1.bench.filter(Boolean).length}/5 Pokémon`} />
        <QuickStat label="Prizes" value={`${player1.prizes.length} vs ${player2.prizes.length}`} />
        <QuickStat label="Mano" value={`${player1.hand.length} cartas`} />
        <QuickStat label="Deck" value={`${player1.deck.length} restantes`} />

        {player1.active && player2.active && (
          <div className="quick-knockout">
            {(() => {
              const canKO = player1.active.card.attacks.some((atk: { damage: string }) => {
                const dmg = parseInt(atk.damage.replace(/[^0-9]/g, '')) || 0;
                return dmg >= player2.active.currentHp;
              });
              return canKO
                ? <span className="ko-yes">🎯 Podés noquear este turno</span>
                : <span className="ko-no">❌ No podés noquear aún</span>;
            })()}
          </div>
        )}
      </div>
    );
  };

  const stateMarkdown = getStateForAI();

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <h3>📋 Exportar Estado</h3>
        <p className="ai-subtitle">
          Copiá el estado actual y pegalo en ChatGPT, Claude, Gemini o cualquier IA para recibir análisis.
        </p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'export' ? 'active' : ''}
          onClick={() => setActiveTab('export')}
        >
          📤 Exportar
        </button>
        <button
          className={activeTab === 'analysis' ? 'active' : ''}
          onClick={() => setActiveTab('analysis')}
        >
          📊 Resumen
        </button>
        <button
          className={activeTab === 'external' ? 'active' : ''}
          onClick={() => setActiveTab('external')}
        >
          🤖 IA Externa
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'export' && (
          <div className="export-content">
            <button
              onClick={copyStateToClipboard}
              className={`copy-big-btn ${copied ? 'copied' : ''}`}
            >
              {copied ? '✅ ¡Copiado!' : '📋 Copiar Estado Completo'}
            </button>
            <p className="export-hint">
              El markdown incluye: estado del tablero, manos visibles, descartes,
              contenido de ambos mazos, ataques disponibles, evoluciones posibles, y más.
            </p>
            <details className="preview-toggle">
              <summary>👁️ Vista previa del markdown</summary>
              <pre className="markdown-preview">{stateMarkdown}</pre>
            </details>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="analysis-full">
            {quickAnalysis()}
          </div>
        )}

        {activeTab === 'external' && (
          <div className="external-content">
            <div className="hf-section">
              <label className="hf-label">HuggingFace API Key (opcional)</label>
              <input
                type="password"
                placeholder="hf_..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="api-key-input"
              />
              <button
                onClick={analyzeWithHF}
                disabled={loading || !apiKey}
                className="analyze-btn"
              >
                {loading ? '⏳ Analizando...' : '🔍 Analizar con Llama 3.1'}
              </button>
            </div>

            {response && (
              <div className="hf-results">
                {response.analysis && (
                  <div className="result-block">
                    <h4>📊 Análisis</h4>
                    <pre>{response.analysis}</pre>
                  </div>
                )}
                {response.recommendations.length > 0 && (
                  <div className="result-block">
                    <h4>🎯 Recomendaciones</h4>
                    {response.recommendations.map(rec => (
                      <div key={rec.id} className="move-recommendation">
                        <div className="move-header">
                          <span className="move-name">{rec.move}</span>
                          <span className="move-ev">EV: {rec.ev}</span>
                        </div>
                        <p className="move-reason">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                {response.odds.win > 0 && (
                  <div className="result-block">
                    <h4>⚖️ Probabilidades</h4>
                    <div className="odds-bar">
                      <div className="odds-win" style={{ width: `${response.odds.win}%` }}>
                        Ganar: {response.odds.win}%
                      </div>
                      <div className="odds-lose" style={{ width: `${response.odds.lose}%` }}>
                        Perder: {response.odds.lose}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="quick-stat">
      <span className="qs-label">{label}</span>
      <span className="qs-value">{value}</span>
    </div>
  );
}
