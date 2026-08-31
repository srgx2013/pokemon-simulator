import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { parseDeckListWithApi } from '@pokemon-simulator/core/data/decks';
import type { DeckPreset } from '@pokemon-simulator/core/types';
import { useStorage } from '@/hooks/useStorage';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported: (deck: DeckPreset) => void;
}

/**
 * External deck-list import modal (S4.3, E-3/E-4, G-1): paste a deck list
 * ("4 Dreepy TWM 128" lines), resolve it through the shared core
 * `parseDeckListWithApi` — which keeps the existing 100ms pacing, 24h cache and
 * backoff/timeout (E-4/G-1: sequential fetches paced, cache-first) — and hand
 * the built preset up for persistence. Text input via `Modal` + confirm via
 * `Alert` (D-4); no browser APIs anywhere.
 */
export function DeckSelectorModal({ visible, onClose, onImported }: Props) {
  const { adapter } = useStorage();
  const [deckList, setDeckList] = useState('');
  const [deckName, setDeckName] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number; cardName: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!deckList.trim() || importing) return;
    setImporting(true);
    setProgress({ current: 0, total: 1, cardName: 'Iniciando…' });
    try {
      const { pokemon, trainers, energies } = await parseDeckListWithApi(adapter, deckList, (cur, tot, n) =>
        setProgress({ current: cur, total: tot, cardName: n }),
      );
      setProgress(null);
      if (pokemon.length > 0 || trainers.length > 0 || energies.length > 0) {
        const newDeck: DeckPreset = {
          id: uuidv4(),
          name: deckName.trim() || 'Mazo importado',
          description: 'Importado',
          pokemon,
          trainers,
          energies,
        };
        setDeckList('');
        setDeckName('');
        onImported(newDeck);
      } else {
        Alert.alert('Sin resultados', 'No se pudo interpretar la lista. Revisá el formato (cantidad + nombre).');
      }
    } catch {
      Alert.alert('Error', 'No se pudo importar la lista.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎯 Importar lista de mazos</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              Pegá una lista por línea (ej: "4 Dreepy TWM 128" o "4 Psychic Energy"). Las cartas se
              resuelven contra la base local y la API de Pokémon TCG (cache 24h, sin re-descargas).
            </Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder={'4 Dreepy TWM 128\n4 Boss\'s Orders\n4 Psychic Energy'}
              placeholderTextColor="#9FB2C8"
              value={deckList}
              onChangeText={setDeckList}
              editable={!importing}
            />
            <TextInput
              style={styles.input}
              placeholder="Nombre del mazo (opcional)"
              placeholderTextColor="#9FB2C8"
              value={deckName}
              onChangeText={setDeckName}
              editable={!importing}
            />
            {progress && (
              <View style={styles.progressBox}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  🔄 {progress.cardName} ({progress.current}/{progress.total})
                </Text>
              </View>
            )}
            <Pressable
              style={[styles.importBtn, (!deckList.trim() || importing) && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={!deckList.trim() || importing}
            >
              <Text style={styles.importBtnText}>{importing ? '⏳ Importando…' : 'Importar mazo'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  body: {
    gap: 10,
  },
  hint: {
    color: '#9FB2C8',
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    backgroundColor: '#0B1220',
    borderRadius: 10,
    color: '#F5F9FF',
    fontSize: 13,
    padding: 10,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  progressBox: {
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B1220',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#208AEF',
  },
  progressText: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  importBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importBtnText: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '800',
  },
});