import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { importStateText } from '@/lib/importExport';
import type { DeckPreset, GameState } from '@pokemon-simulator/core/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported: (gameState: GameState) => void;
  player1Deck?: DeckPreset | null;
  player2Deck?: DeckPreset | null;
};

/**
 * JSON state import modal (F-2 web parity): paste a JSON exported by the web app
 * (or by this app's export tab) and restore it onto the board. Runs the shared
 * core `importStateFromJson` with the selected decks as context, reports
 * validation errors, and hands the restored state back to the caller, which is
 * responsible for navigating to the board.
 */
export function StateImportModal({ visible, onClose, onImported, player1Deck, player2Deck }: Props) {
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);

  const handleImport = () => {
    if (!text.trim() || importing) return;
    setImporting(true);
    try {
      const result = importStateText(text, { player1: player1Deck ?? null, player2: player2Deck ?? null });
      if (!result.ok) {
        setErrors(result.errors ?? ['No se pudo importar el estado.']);
        setImporting(false);
        return;
      }
      setText('');
      setErrors(null);
      setImporting(false);
      onImported(result.gameState);
      Alert.alert('Escenario importado', 'El estado se restauró en el tablero.');
    } catch {
      setErrors(['Error inesperado al importar el estado.']);
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>📥 Importar estado (JSON)</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Pegá el JSON exportado por la web o por esta app. Al importar, el tablero se carga con el estado
            restaurado.
          </Text>

          <TextInput
            style={styles.input}
            multiline
            placeholder="Pegá el JSON acá…"
            placeholderTextColor="#7B8794"
            value={text}
            onChangeText={setText}
            editable={!importing}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {errors && (
            <ScrollView style={styles.errorsBox} nestedScrollEnabled>
              {errors.map((err, i) => (
                <Text key={i} style={styles.errorText}>
                  • {err}
                </Text>
              ))}
            </ScrollView>
          )}

          <Pressable
            style={[styles.importBtn, (!text.trim() || importing) && styles.importBtnDisabled]}
            onPress={handleImport}
            disabled={!text.trim() || importing}
          >
            <Text style={styles.importBtnText}>{importing ? '⏳ Importando…' : 'Importar y cargar tablero'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#131E33',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#F5F7FA',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#7B8794',
    fontSize: 18,
  },
  hint: {
    color: '#8FA3BF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0B1220',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22304A',
    color: '#F5F7FA',
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 140,
    maxHeight: 220,
    padding: 12,
    textAlignVertical: 'top',
  },
  errorsBox: {
    marginTop: 10,
    maxHeight: 110,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    marginBottom: 4,
  },
  importBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  importBtnDisabled: {
    opacity: 0.45,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});