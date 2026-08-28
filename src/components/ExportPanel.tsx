import { useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';

// URL del coach server local. Para acceso remoto vía Tailscale, cambiá a
// http://<tu-ip-tailscale>:9000 (y arrancá el server con COACH_HOST=0.0.0.0).
const COACH_URL = 'http://localhost:9000';

type CoachStatus = 'idle' | 'sending' | 'pending' | 'checking' | 'done' | 'error';

export function ExportPanel() {
  const [copied, setCopied] = useState(false);
  const [coachStatus, setCoachStatus] = useState<CoachStatus>('idle');
  const [coachResult, setCoachResult] = useState('');
  const [coachId, setCoachId] = useState('');
  const [coachError, setCoachError] = useState('');
  const getStateForAI = useGameStore(state => state.getStateForAI);

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

  const analyzeWithCoach = useCallback(async () => {
    setCoachStatus('sending');
    setCoachError('');
    setCoachResult('');
    setCoachId('');
    try {
      const markdown = getStateForAI();
      const res = await fetch(`${COACH_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!data.id) throw new Error('Sin id del coach');

      setCoachId(data.id);
      setCoachStatus('pending');
      // Human-in-the-loop: el coach (pi) necesita que apretes Enter.
      // El resultado se consulta manualmente con "Ver resultado".
    } catch {
      setCoachStatus('error');
      setCoachError('No se pudo conectar al coach server. ¿Está corriendo? (bun run coach)');
    }
  }, [getStateForAI]);

  const checkCoachResult = useCallback(async () => {
    if (!coachId) return;
    setCoachStatus('checking');
    try {
      const r = await fetch(`${COACH_URL}/result/${coachId}`);
      const d = await r.json();
      if (d.status === 'done') {
        setCoachResult(d.result);
        setCoachStatus('done');
      } else if (d.status === 'pending') {
        setCoachStatus('pending');
      } else if (d.status === 'error') {
        setCoachStatus('error');
        setCoachError(d.error ?? 'No se encontró el resultado del coach.');
      } else {
        setCoachStatus('error');
        setCoachError('No se encontró el resultado del coach.');
      }
    } catch {
      setCoachStatus('error');
      setCoachError('No se pudo conectar al coach server.');
    }
  }, [coachId]);

  const stateMarkdown = getStateForAI();
  const busy = coachStatus === 'sending' || coachStatus === 'pending' || coachStatus === 'checking';

  return (
    <div className="export-panel">
      <div className="export-header">
        <h3>📋 Exportar Estado</h3>
        <p className="export-subtitle">
          Copiá el estado actual y pegalo en ChatGPT, Claude, Gemini o cualquier IA para recibir análisis.
        </p>
      </div>

      <div className="export-content">
        <button
          onClick={copyStateToClipboard}
          className={`copy-big-btn ${copied ? 'copied' : ''}`}
        >
          {copied ? '✅ ¡Copiado!' : '📋 Copiar Estado Completo'}
        </button>

        <button
          onClick={analyzeWithCoach}
          className="import-btn"
          disabled={busy}
        >
          {coachStatus === 'sending' ? '⏳ Enviando al coach...'
            : coachStatus === 'pending' ? '⏳ Esperando al coach...'
            : coachStatus === 'checking' ? '⏳ Consultando...'
            : '📤 Analizar con el coach'}
        </button>

        {coachId && coachStatus !== 'done' && (
          <button
            onClick={checkCoachResult}
            className="import-btn"
            disabled={coachStatus === 'checking'}
          >
            👁️ Ver resultado
          </button>
        )}

        {coachStatus === 'pending' && (
          <p className="export-hint">
            Escenario enviado al coach. Andá a pi, apretá <strong>Enter</strong> para que analice, y clickeá <strong>Ver resultado</strong> cuando termine.
          </p>
        )}

        {coachStatus === 'done' && (
          <pre className="markdown-preview">{coachResult}</pre>
        )}
        {coachStatus === 'error' && (
          <div className="import-error">{coachError}</div>
        )}

        <p className="export-hint">
          El markdown incluye: estado del tablero, manos visibles, descartes,
          contenido de ambos mazos, ataques disponibles, evoluciones posibles, y más.
        </p>
        <details className="preview-toggle">
          <summary>👁️ Vista previa del markdown</summary>
          <pre className="markdown-preview">{stateMarkdown}</pre>
        </details>
      </div>
    </div>
  );
}
