import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { generateImportPrompt, generateLogPrompt } from '@pokemon-simulator/core/services/promptGenerator';
import { useStorage } from '@/hooks/useStorage';
import { buildExportMarkdown, importStateText } from '@/lib/importExport';
import { copyText, shareText } from '@/lib/clipboard';

/**
 * Export/import surface (S4.4, F-1/F-2, D-4): the exported markdown is produced
 * by the shared core exporter with the exact call shape the web app uses, so the
 * payload is byte-identical to the web export of the same state (F-1); clipboard
 * and share go through expo-clipboard/expo-sharing (no navigator.clipboard /
 * document.createElement, D-4). Import runs the same core `importStateFromJson`
 * the web uses for round-trip equality (F-2). NO coach entry point (D-3).
 */
export function ExportPanelView() {
  const { store } = useStorage();
  const gameState = store(s => s.gameState);
  const player1Deck = store(s => s.player1Deck);
  const player2Deck = store(s => s.player2Deck);
  const importGameState = store(s => s.importGameState);

  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState<'log' | 'screenshot' | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string[] | null>(null);

  const markdown = useMemo(
    () => buildExportMarkdown(gameState, player1Deck, player2Deck),
    [gameState, player1Deck, player2Deck],
  );

  const handleCopy = async () => {
    await copyText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await shareText(markdown);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el menú de compartir.');
    }
  };

  const handleCopyPrompt = async (kind: 'log' | 'screenshot') => {
    const text = kind === 'log' ? generateLogPrompt(player1Deck, player2Deck, 'srgx2013') : generateImportPrompt(player1Deck);
    await copyText(text);
    setPromptCopied(kind);
    setTimeout(() => setPromptCopied(null), 2500);
  };

  const handleImport = () => {
    const result = importStateText(importText, { player1: player1Deck, player2: player2Deck });
    if (result.ok) {
      importGameState(result.gameState);
      setImportText('');
      setImportError(null);
      setShowImport(false);
      Alert.alert('Escenario importado', 'El estado se restauró en el tablero.');
    } else {
      setImportError(result.errors);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📋 Exportar Estado</Text>
      <Text style={styles.subtitle}>
        Copiá el estado actual y pegalo en ChatGPT, Claude, Gemini o cualquier IA para recibir análisis.
      </Text>

      <Pressable style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={handleCopy}>
        <Text style={styles.copyBtnText}>{copied ? '✅ ¡Copiado!' : '📋 Copiar Estado Completo'}</Text>
      </Pressable>
      <View style={styles.rowButtons}>
        <Pressable style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 Compartir</Text>
        </Pressable>
        <Pressable style={styles.shareBtn} onPress={() => setShowImport(true)}>
          <Text style={styles.shareBtnText}>📥 Importar</Text>
        </Pressable>
      </View>

      <View style={styles.promptBox}>
        <Text style={styles.promptTitle}>Paso 1 — copiá el prompt para tu IA</Text>
        <Pressable style={styles.promptBtn} onPress={() => handleCopyPrompt('log')}>
          <Text style={styles.promptBtnText}>
            {promptCopied === 'log' ? '✅ ¡Copiado!' : '📋 Copiar prompt de log (recomendado)'}
          </Text>
        </Pressable>
        <Pressable style={styles.promptBtn} onPress={() => handleCopyPrompt('screenshot')}>
          <Text style={styles.promptBtnText}>
            {promptCopied === 'screenshot' ? '✅ ¡Copiado!' : '📷 Copiar prompt de captura'}
          </Text>
        </Pressable>
        <Text style={styles.promptHint}>
          Paso 2 — en Importar pegá el JSON que te devuelva la IA y cargalo.
        </Text>
      </View>

      <Text style={styles.previewTitle}>👁️ Vista previa del markdown</Text>
      <Text selectable style={styles.preview}>
        {markdown}
      </Text>

      <Modal visible={showImport} transparent animationType="slide" onRequestClose={() => setShowImport(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📥 Importar Escenario</Text>
              <Pressable onPress={() => setShowImport(false)} hitSlop={8}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.importInput}
              multiline
              placeholder={'{\n  "turn": 1,\n  "player1": {}\n}'}
              placeholderTextColor="#9FB2C8"
              value={importText}
              onChangeText={setImportText}
            />
            {importError && importError.length > 0 && (
              <View style={styles.errorBox}>
                {importError.map((e, i) => (
                  <Text key={i} style={styles.errorText}>
                    {e}
                  </Text>
                ))}
              </View>
            )}
            <Pressable
              style={[styles.loadBtn, !importText.trim() && styles.loadBtnDisabled]}
              onPress={handleImport}
              disabled={!importText.trim()}
            >
              <Text style={styles.loadBtnText}>Cargar escenario</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    padding: 14,
    gap: 10,
    paddingBottom: 40,
  },
  title: {
    color: '#F5F9FF',
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9FB2C8',
    fontSize: 13,
  },
  copyBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyBtnDone: {
    backgroundColor: '#4CC38A',
  },
  copyBtnText: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '800',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#16213A',
    borderColor: '#2A3B5C',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '700',
  },
  promptBox: {
    backgroundColor: '#16213A',
    borderRadius: 12,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  promptTitle: {
    color: '#F5F9FF',
    fontSize: 12,
    fontWeight: '700',
  },
  promptBtn: {
    backgroundColor: '#0B1220',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderColor: '#2A3B5C',
    borderWidth: 1,
  },
  promptBtnText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '700',
  },
  promptHint: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  previewTitle: {
    color: '#F5F9FF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  preview: {
    color: '#C9D6EA',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#16213A',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#F5F9FF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalClose: {
    color: '#9FB2C8',
    fontSize: 16,
    fontWeight: '700',
  },
  importInput: {
    backgroundColor: '#0B1220',
    borderRadius: 10,
    color: '#F5F9FF',
    fontSize: 13,
    padding: 10,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: '#3A1620',
    borderRadius: 8,
    padding: 8,
    gap: 2,
    marginTop: 8,
  },
  errorText: {
    color: '#FF7B80',
    fontSize: 12,
  },
  loadBtn: {
    backgroundColor: '#4CC38A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  loadBtnDisabled: {
    opacity: 0.4,
  },
  loadBtnText: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '800',
  },
});