import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';

// URL del coach server local. Para acceso remoto vía Tailscale, cambiá a
// http://<tu-ip-tailscale>:9000 (y arrancá el server con COACH_HOST=0.0.0.0).
// Coach server URL. For remote/Tailscale access, override with VITE_COACH_URL
// (e.g. VITE_COACH_URL=http://100.84.33.17:9000 npm run dev:remote).
const COACH_URL = import.meta.env.VITE_COACH_URL ?? 'http://localhost:9000';

// Persistencia de la sesion del coach para sobrevivir a que el celu mate la
// app o recargue la SPA. El server ya guarda el resultado para siempre en
// scripts/coach-outbox/<id>.md; solo falta que el cliente recuerde el id.
const COACH_SESSION_KEY = 'pokemon-coach-session';

type CoachStatus = 'idle' | 'sending' | 'pending' | 'checking' | 'done' | 'error';

type CoachSession = {
  coachId: string;
  coachStatus: CoachStatus;
  coachResult: string;
  coachError: string;
};

function loadCoachSession(): CoachSession | null {
  try {
    const raw = localStorage.getItem(COACH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as CoachSession) : null;
  } catch {
    return null;
  }
}

function saveCoachSession(s: CoachSession): void {
  try {
    localStorage.setItem(COACH_SESSION_KEY, JSON.stringify(s));
  } catch {
    /* localStorage no disponible: ignoramos la persistencia */
  }
}

function clearCoachSession(): void {
  try {
    localStorage.removeItem(COACH_SESSION_KEY);
  } catch {
    /* localStorage no disponible */
  }
}

export function ExportPanel() {
  const [copied, setCopied] = useState(false);
  const initialSession = useMemo(loadCoachSession, []);
  const [coachStatus, setCoachStatus] = useState<CoachStatus>(initialSession?.coachStatus ?? 'idle');
  const [coachResult, setCoachResult] = useState(initialSession?.coachResult ?? '');
  const [coachId, setCoachId] = useState(initialSession?.coachId ?? '');
  const [coachError, setCoachError] = useState(initialSession?.coachError ?? '');
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

  // Persistir la sesion del coach para que "Ver resultado" y la descarga
  // sobrevivan a un reload del celu (el server ya la guarda para siempre).
  useEffect(() => {
    if (coachId) {
      saveCoachSession({ coachId, coachStatus, coachResult, coachError });
    } else {
      clearCoachSession();
    }
  }, [coachId, coachStatus, coachResult, coachError]);

  // Al volver (app recargada), si habia un analisis pendiente, reconsultamos
  // el server para recuperar el resultado automaticamente.
  useEffect(() => {
    if (coachId && coachStatus !== 'done' && coachStatus !== 'error') {
      void checkCoachResult();
    }
    // Solo en montaje: rehidratamos desde localStorage una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadResult = useCallback(() => {
    if (!coachResult) return;
    const blob = new Blob([coachResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach-${coachId || 'analisis'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [coachResult, coachId]);

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

        {coachStatus === 'done' && coachResult && (
          <button onClick={downloadResult} className="import-btn">
            💾 Descargar .md
          </button>
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
