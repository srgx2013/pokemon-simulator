import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGameStore } from '../lib/gameStore';
import { importStateFromJson } from '@pokemon-simulator/core/services/stateImporter';
import {
  loadCoachSession,
  saveCoachSession,
  clearCoachSession,
} from '../lib/coachSession';
import type { CoachStatus } from '../lib/coachSession';

// URL del coach server local. Para acceso remoto vía Tailscale, cambiá a
// http://<tu-ip-tailscale>:9000 (y arrancá el server con COACH_HOST=0.0.0.0).
// Coach server URL. For remote/Tailscale access, override with VITE_COACH_URL
// (e.g. VITE_COACH_URL=http://100.84.33.17:9000 npm run dev:remote).
const COACH_URL = import.meta.env.VITE_COACH_URL ?? 'http://localhost:9000';

// HTTPS page can't call a local HTTP server (mixed content): the coach URL is
// configurable at runtime (stored in localStorage) — paste an https tunnel URL
// (cloudflared) to use the coach from the published site.
const DEFAULT_COACH_URL = COACH_URL;
const initialCoachUrl = (): string => {
  try {
    return window.localStorage.getItem('coachUrl') ?? DEFAULT_COACH_URL;
  } catch {
    return DEFAULT_COACH_URL;
  }
};

// Persistencia de la sesion del coach para sobrevivir a que el celu mate la
// app o recargue la SPA. El server ya guarda el resultado para siempre en
// scripts/coach-outbox/<id>.md; solo falta que el cliente recuerde el id.
// La sesion fluye por el web adapter (7ma key, spec C-1/SC7) — la
// implementacion vive en apps/web/src/lib/coachSession.ts.

export function ExportPanel() {
  const [copied, setCopied] = useState(false);
  const [coachStatus, setCoachStatus] = useState<CoachStatus>('idle');
  const [coachResult, setCoachResult] = useState('');
  const [coachId, setCoachId] = useState('');
  const [coachError, setCoachError] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [coachUrl, setCoachUrl] = useState<string>(initialCoachUrl);
  const coachBlocked = typeof window !== 'undefined' && window.location.protocol === 'https:' && coachUrl.startsWith('http:');
  const saveCoachUrl = (u: string) => {
    setCoachUrl(u);
    try { window.localStorage.setItem('coachUrl', u); } catch { /* ignore */ }
  };
  const [logText, setLogText] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'sending' | 'pending' | 'checking' | 'error'>('idle');
  const [keyId, setKeyId] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keyResult, setKeyResult] = useState<any>(null);
  const [keyShow, setKeyShow] = useState(false);
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

  const analyzeWithCoach = useCallback(async () => {
    const hasBoard = !!(gameState?.player1?.active || gameState?.player2?.active);
    if (!hasBoard) {
      setCoachError('El tablero está vacío: armá la partida (activos/bench) antes de analizar.');
      setCoachStatus('error');
      return;
    }
    setCoachStatus('sending');
    setCoachError('');
    setCoachResult('');
    setCoachId('');
    try {
      const markdown = getStateForAI();
      const res = await fetch(`${coachUrl}/analyze`, {
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
      setCoachError('No se pudo conectar al coach server. ¿Está corriendo? (npm run coach)');
    }
  }, [getStateForAI, gameState]);

  const checkCoachResult = useCallback(async (id?: string) => {
    const target = id ?? coachId;
    if (!target) return;
    setCoachStatus('checking');
    try {
      const r = await fetch(`${coachUrl}/result/${target}`);
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
      void saveCoachSession({ coachId, coachStatus, coachResult, coachError });
    } else {
      void clearCoachSession();
    }
  }, [coachId, coachStatus, coachResult, coachError]);

  // Al volver (app recargada), si habia un analisis pendiente, reconsultamos
  // el server para recuperar el resultado automaticamente. La sesion se
  // restaura de forma asincrona a traves del web adapter (C-2): el id
  // vuelve despues del render inicial, asi que el re-check usa el id
  // restaurado explicitamente en lugar del closure del primer render.
  useEffect(() => {
    let cancelled = false;
    void loadCoachSession().then((session) => {
      if (cancelled || !session) return;
      setCoachId(session.coachId);
      setCoachStatus(session.coachStatus);
      setCoachResult(session.coachResult);
      setCoachError(session.coachError);
      if (session.coachId && session.coachStatus !== 'done' && session.coachStatus !== 'error') {
        void checkCoachResult(session.coachId);
      }
    });
    return () => { cancelled = true; };
    // Solo en montaje: rehidratamos la sesion del coach una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando el analisis termina, abrimos el modal a pantalla completa.
  useEffect(() => {
    if (coachStatus === 'done' && coachResult) {
      setShowResult(true);
    }
  }, [coachStatus, coachResult]);

  const parseStateJson = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.gameState && typeof obj.gameState === 'object') return obj.gameState;
    if (obj.estadoDelTurno && typeof obj.estadoDelTurno === 'object') return obj.estadoDelTurno;
    return null;
  };

  const parseCoachState = (text: string): any => {
    if (!text) return null;
    try {
      const direct = parseStateJson(JSON.parse(text));
      if (direct) return direct;
    } catch { /* not plain JSON */ }
    const m = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (m) {
      try {
        const fromBlock = parseStateJson(JSON.parse(m[1]));
        if (fromBlock) return fromBlock;
      } catch { /* skip malformed fenced block */ }
    }
    return null;
  };

  const loadResultAsBoard = useCallback(() => {
    const state = parseCoachState(coachResult);
    if (!state) {
      setCoachError('El resultado de Pi no contiene JSON de estado para cargar.');
      return;
    }
    const st = useGameStore.getState();
    const res = importStateFromJson(JSON.stringify(state), {
      player1: st.player1Deck,
      player2: st.player2Deck,
    });
    if (!res.ok) {
      setCoachError((res.errors ?? ['no se pudo importar']).join('\n'));
      return;
    }
    st.importGameState(res.gameState);
    setShowResult(false);
    setCoachError('');
    alert('Tablero creado: el estado del resultado se cargó.');
  }, [coachResult]);

  const handlePasteLog = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setLogText(t.trim());
    } catch {
      setKeyError('No se pudo leer el portapapeles.');
    }
  };

  const sendLogForKeyScenario = async () => {
    if (!logText.trim() || keyStatus === 'sending') return;
    setKeyStatus('sending');
    setKeyError('');
    setKeyResult(null);
    try {
      const res = await fetch(`${coachUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: logText, agent: 'key-scenario' }),
      });
      const data = await res.json();
      if (!data.id) throw new Error('Sin id');
      setKeyId(data.id);
      setKeyStatus('pending');
    } catch {
      setKeyStatus('error');
      setKeyError('No se pudo conectar al coach server.');
    }
  };

  const checkKeyResult = async () => {
    if (!keyId || keyStatus === 'checking') return;
    setKeyStatus('checking');
    setKeyError('');
    try {
      const r = await fetch(`${coachUrl}/result/${keyId}`);
      const d = await r.json();
      if (d.status === 'done') {
        let parsed: any = null;
        try { parsed = JSON.parse(d.result ?? ''); } catch { parsed = null; }
        setKeyResult(parsed && parsed.escenarioClave ? parsed : { escenarioClave: null, raw: d.result });
        setKeyShow(true);
        setKeyStatus('idle');
      } else if (d.status === 'pending') {
        setKeyStatus('pending');
      } else {
        setKeyStatus('error');
        setKeyError(d.error ?? 'No se encontró el resultado del coach.');
      }
    } catch {
      setKeyStatus('error');
      setKeyError('No se pudo consultar el resultado en el coach server.');
    }
  };

  const loadKeyScenario = () => {
    const esc = keyResult?.escenarioClave;
    if (!esc?.estadoDelTurno) {
      setKeyError('No hay estado del turno clave para cargar.');
      return;
    }
    const st = useGameStore.getState();
    const res = importStateFromJson(JSON.stringify(esc.estadoDelTurno), {
      player1: st.player1Deck,
      player2: st.player2Deck,
    });
    if (!res.ok) {
      setKeyError((res.errors ?? ['no se pudo importar']).join('\n'));
      return;
    }
    st.importGameState(res.gameState);
    setKeyShow(false);
    alert(`Jugada clave cargada: turno ${esc.turno} restaurado en el tablero.`);
  };

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
    <>
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

        <label className="export-sub">
          URL del coach (o túnel https):{' '}
          <input
            className="coach-url-input"
            value={coachUrl}
            onChange={(e) => saveCoachUrl(e.target.value)}
            spellCheck={false}
          />
        </label>
        {coachBlocked && (
          <p className="export-hint coach-warning">
            ⚠️ La URL del coach es HTTP y estás en HTTPS: el navegador bloquea la conexión.
            Pegá un túnel https (cloudflared) o corré la web en local (<code>npm run dev</code>).
          </p>
        )}
        <button
          onClick={analyzeWithCoach}
          className="import-btn"
          disabled={busy || coachBlocked}
        >
          {coachStatus === 'sending' ? '⏳ Enviando al coach...'
            : coachStatus === 'pending' ? '⏳ Esperando al coach...'
            : coachStatus === 'checking' ? '⏳ Consultando...'
            : '📤 Analizar con el coach'}
        </button>

        {coachId && coachStatus !== 'done' && (
          <button
            onClick={() => checkCoachResult()}
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

        {coachStatus === 'done' && coachResult && (
          <button onClick={() => setShowResult(true)} className="import-btn result-open-btn">
            📖 Ver análisis en pantalla completa
          </button>
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
        <h4 className="export-sub">🎯 Jugada clave desde el log</h4>
        <textarea
          className="log-input"
          value={logText}
          onChange={(e) => setLogText(e.target.value)}
          placeholder="(pegá el log de la partida)"
          rows={4}
        />
        <div className="export-row">
          <button onClick={() => setLogText('')} disabled={!logText.trim()} className="import-btn">🗑 Borrar</button>
          <button onClick={handlePasteLog} className="import-btn">📋 Pegar log</button>
          <button
            onClick={sendLogForKeyScenario}
            className="import-btn"
            disabled={!logText.trim() || keyStatus === 'sending' || keyStatus === 'checking' || coachBlocked}
          >
            {keyStatus === 'sending' ? '⏳…' : '🔍 Detectar jugada clave'}
          </button>
        </div>
        {keyStatus === 'pending' && (
          <p className="export-hint">
            Log enviado (id {keyId}). Pi determina el escenario clave — tocá &quot;Ver escenario&quot; cuando esté.
          </p>
        )}
        {keyId && (
          <button onClick={checkKeyResult} className="import-btn" disabled={keyStatus === 'checking'}>
            🔎 Ver escenario clave
          </button>
        )}
        {keyError && <div className="import-error">{keyError}</div>}

        <details className="preview-toggle">
          <summary>👁️ Vista previa del markdown</summary>
          <pre className="markdown-preview">{stateMarkdown}</pre>
        </details>
      </div>
    </div>

        {keyShow && createPortal(
          <div className="result-modal-overlay" onClick={() => setKeyShow(false)}>
            <div className="result-modal" onClick={(e) => e.stopPropagation()}>
              <div className="result-modal-header">
                <h2>🎯 Escenario clave</h2>
                <button className="result-modal-close" onClick={() => setKeyShow(false)} aria-label="Cerrar">✕</button>
              </div>
              <div className="result-modal-body">
                <h3>
                  {keyResult?.escenarioClave
                    ? `Turno ${keyResult.escenarioClave.turno} — ${keyResult.escenarioClave.jugador === 'player2' ? 'rival' : 'vos'}`
                    : 'Sin escenario detectado'}
                </h3>
                <p>{keyResult?.escenarioClave?.jugada ?? 'El log no fue procesado.'}</p>
                <p>{keyResult?.escenarioClave?.porQueDecidioLaPartida ?? keyResult?.raw ?? ''}</p>
                {keyResult?.escenarioClave?.estadoDelTurno && (
                  <button onClick={loadKeyScenario} className="import-btn">⚔️ Cargar turno y analizar en el tablero</button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

        {showResult && coachResult && createPortal(
      <div className="result-modal-overlay" onClick={() => setShowResult(false)}>
        <div className="result-modal" onClick={(e) => e.stopPropagation()}>
          <div className="result-modal-header">
            <h2>📊 Análisis del coach</h2>
            <button className="result-modal-close" onClick={() => setShowResult(false)} aria-label="Cerrar">✕</button>
          </div>
          <div className="result-modal-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{coachResult}</ReactMarkdown>
          </div>
          <div className="result-modal-footer">
            {parseCoachState(coachResult) && (
              <button onClick={loadResultAsBoard} className="import-btn">📥 Crear tablero desde el resultado</button>
            )}
            <button onClick={downloadResult} className="import-btn">💾 Descargar .md</button>
            <button onClick={() => setShowResult(false)} className="import-btn">Cerrar</button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    </>
  );
}
