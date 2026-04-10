import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'analysis' | 'moves' | 'odds'>('analysis');
  
  const getStateForAI = useGameStore(state => state.getStateForAI);
  const gameState = useGameStore(state => state.gameState);

  const copyStateToClipboard = async () => {
    const stateText = getStateForAI();
    
    try {
      await navigator.clipboard.writeText(stateText);
      alert('✅ Estado copiado al portapapeles.\n\nPega este texto en tu IA favorita para análisis.');
      return stateText;
    } catch (error) {
      console.error('Copy error:', error);
      // Fallback: seleccionar texto
      const textarea = document.createElement('textarea');
      textarea.value = stateText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Estado copiado (fallback).\n\nPega este texto en tu IA favorita para análisis.');
      return stateText;
    }
  };

  const analyze = async () => {
    // First copy state to clipboard
    const stateText = await copyStateToClipboard();
    
    if (!apiKey) {
      return; // Still copied, but don't call API
    }

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
    const p1Active = player1.active;
    const p2Active = player2.active;
    
    let analysis = '## Análisis Rápido\n\n';
    
    if (!p1Active || !p2Active) {
      analysis += '⚠️ Falta configurar Pokémon activos para ambos jugadores.\n';
    } else {
      if (p1Active.currentHp <= 0) {
        analysis += '❌ Tu Pokémon activo está derrotado. Necesitas hacer retreat o usar otro.\n';
      } else if (p2Active.currentHp <= 0) {
        analysis += '✅ El Pokémon enemigo está derrotado. Tienes ventaja.\n';
      } else {
        const canKnockout = p1Active.card.attacks.some((atk: { damage: string }) => {
          const damage = parseInt(atk.damage.replace('+', '').split(' ')[0]) || 0;
          return damage >= p2Active.currentHp;
        });
        
        if (canKnockout) {
          analysis += '🎯 Puedes noquear al enemigo este turno.\n';
        } else {
          analysis += '⚔️ Ambos siguen con vida. Evalúa el intercambio de daños.\n';
        }
      }
      
      analysis += `\n### Tu Estado\n`;
      analysis += `- HP: ${p1Active.currentHp}/${p1Active.card.hp}\n`;
      analysis += `- Energía: ${p1Active.attachedEnergy.join(', ') || 'Ninguna'}\n`;
      analysis += `- Bench: ${player1.bench.filter(Boolean).length} Pokémon\n`;
      
      analysis += `\n### Enemigo\n`;
      analysis += `- HP: ${p2Active.currentHp}/${p2Active.card.hp}\n`;
      analysis += `- Prizes restantes: ${p2Active.currentHp > 0 ? player2.prizes.length : 0}\n`;
    }
    
    return analysis;
  };

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <h3>🤖 Asistente IA</h3>
        <input
          type="password"
          placeholder="HF API Key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="api-key-input"
        />
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'analysis' ? 'active' : ''} 
          onClick={() => setActiveTab('analysis')}
        >
          Análisis
        </button>
        <button 
          className={activeTab === 'moves' ? 'active' : ''} 
          onClick={() => setActiveTab('moves')}
        >
          Movimientos
        </button>
        <button 
          className={activeTab === 'odds' ? 'active' : ''} 
          onClick={() => setActiveTab('odds')}
        >
          Odds
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'analysis' && (
          <div className="analysis-content">
            <pre>{quickAnalysis()}</pre>
            {response?.analysis && <pre className="ai-response">{response.analysis}</pre>}
          </div>
        )}

        {activeTab === 'moves' && (
          <div className="moves-content">
            {response?.recommendations.map(rec => (
              <div key={rec.id} className="move-recommendation">
                <div className="move-header">
                  <span className="move-name">{rec.move}</span>
                  <span className="move-ev">EV: {rec.ev}</span>
                </div>
                <p className="move-reason">{rec.reason}</p>
              </div>
            ))}
            {!response?.recommendations.length && (
              <p className="no-data">Ejecuta análisis para ver recomendaciones</p>
            )}
          </div>
        )}

        {activeTab === 'odds' && (
          <div className="odds-content">
            {response ? (
              <>
                <div className="odds-bar">
                  <div 
                    className="odds-win" 
                    style={{ width: `${response.odds.win}%` }}
                  >
                    Ganar: {response.odds.win}%
                  </div>
                  <div 
                    className="odds-lose"
                    style={{ width: `${response.odds.lose}%` }}
                  >
                    Perder: {response.odds.lose}%
                  </div>
                </div>
              </>
            ) : (
              <p className="no-data">Sin datos aún</p>
            )}
          </div>
        )}
      </div>

      <div className="ai-actions">
        <button onClick={copyStateToClipboard} className="copy-btn">
          📋 Copiar Estado
        </button>
        <button onClick={analyze} disabled={loading} className="analyze-btn">
          {loading ? '⏳ Analizando...' : '🔍 Analizar con IA'}
        </button>
      </div>
    </div>
  );
}