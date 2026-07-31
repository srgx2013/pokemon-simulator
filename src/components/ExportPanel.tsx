import { useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function ExportPanel() {
  const [copied, setCopied] = useState(false);
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

  const stateMarkdown = getStateForAI();

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
