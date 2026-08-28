import { useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';

// URL del coach server local. Para acceso remoto vía Tailscale, cambiá a
// http://<tu-ip-tailscale>:9000 (y arrancá el server con COACH_HOST=0.0.0.0).
const COACH_URL = 'http://localhost:9000';

type CoachStatus = 'idle' | 'sending' | 'pending' | 'done' | 'error';

export function ExportPanel() {
  const [copied, setCopied] = useState(false);
  const [coachStatus, setCoachStatus] = useState<CoachStatus>('idle');
  const [coachResult, setCoachResult] = useState('');
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
    try {
      const markdown = getStateForAI();
      const res = await fetch(`${COACH_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!data.id) throw new Error('Sin id del coach');

      setCoachStatus('pending');

      // Polling: consulta el resultado cada 3s (máx ~60s)
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const r2 = await fetch(`${COACH_URL}/result/${data.id}`);
        const d2 = await r2.json();
        if (d2.status === 'done') {
          setCoachResult(d2.result);
          setCoachStatus('done');
          return;
        }
      }
      setCoachStatus('error');
      setCoachError('El coach tardó demasiado. Volvé a consultar en unos segundos.');
    } catch {
      setCoachStatus('error');
      setCoachError('No se pudo conectar al coach server. ¿Está corriendo? (bun run coach)');
    }
  }, [getStateForAI]);

  const stateMarkdown = getStateForAI();
  const busy = coachStatus === 'sending' || coachStatus === 'pending';

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
            : '📤 Analizar con el coach'}
        </button>

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
