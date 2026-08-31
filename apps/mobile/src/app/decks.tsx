import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { DeckPreset } from '@pokemon-simulator/core/types';
import { useStorage } from '@/hooks/useStorage';
import { DeckSelectorModal } from '@/components/deck-selector-modal';
import { StateImportModal } from '@/components/state-import-modal';
import { deckCardCounts } from '@/lib/deckUtils';

/**
 * Deck browser tab (S4.3, E-3/E-4): mirrors the web — NO built-in presets; only
 * custom decks added by the user through an external deck-list import
 * (async adapter-persisted store actions, C-5/E-3, surviving restarts). Lists
 * resolve through core `pokemonTcgApi` with pacing + cache-first (E-4, G-1).
 * Confirmation via `Alert`, input via `Modal` (D-4).
 */
export default function DecksScreen() {
  const { store } = useStorage();
  const router = useRouter();
  const customDecks = store(s => s.customDecks);
  const importGameState = store(s => s.importGameState);
  const loadCustomDecks = store(s => s.loadCustomDecks);
  const addCustomDeck = store(s => s.addCustomDeck);
  const removeCustomDeck = store(s => s.removeCustomDeck);
  const player1Deck = store(s => s.player1Deck);
  const player2Deck = store(s => s.player2Deck);
  const setPlayer1Deck = store(s => s.setPlayer1Deck);
  const setPlayer2Deck = store(s => s.setPlayer2Deck);
  const startGame = store(s => s.startGame);

  const [showImport, setShowImport] = useState(false);
  const [showStateImport, setShowStateImport] = useState(false);

  useEffect(() => {
    void loadCustomDecks();
  }, [loadCustomDecks]);

  const chooseDeck = (deck: DeckPreset) => {
    Alert.alert('Elegir mazo', `¿A qué jugador asignás "${deck.name}"?`, [
      { text: 'Tú (P1)', onPress: () => setPlayer1Deck(deck) },
      { text: 'Rival (P2)', onPress: () => setPlayer2Deck(deck) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleDelete = (deck: DeckPreset) => {
    Alert.alert('Eliminar mazo', `¿Eliminar "${deck.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeCustomDeck(deck.id!) },
    ]);
  };

  const handleImported = async (deck: DeckPreset) => {
    await addCustomDeck(deck);
    Alert.alert('Mazo importado', `"${deck.name}" se guardó en tus mazos.`, [
      { text: 'Tú (P1)', onPress: () => setPlayer1Deck(deck) },
      { text: 'Rival (P2)', onPress: () => setPlayer2Deck(deck) },
      { text: 'Listo', style: 'cancel' },
    ]);
  };

  const handleStart = () => {
    if (player1Deck && player2Deck) {
      startGame();
      router.replace('/');
    }
  };

  const renderDeckRow = (deck: DeckPreset, custom: boolean) => {
    const counts = deckCardCounts(deck);
    return (
      <View key={deck.id ?? deck.name} style={styles.deckRow}>
        <Pressable style={styles.deckInfo} onPress={() => chooseDeck(deck)}>
          <Text style={styles.deckName}>{deck.name}</Text>
          <Text style={styles.deckDescription} numberOfLines={2}>
            {deck.description}
          </Text>
          <Text style={styles.deckCounts}>
            {counts.pokemon} Pokémon · {counts.trainers} Entrenadores · {counts.energies} Energías — {counts.total}{' '}
            cartas
          </Text>
        </Pressable>
        <Pressable style={styles.chooseBtn} onPress={() => chooseDeck(deck)}>
          <Text style={styles.chooseBtnText}>Elegir</Text>
        </Pressable>
        {custom && (
          <Pressable style={styles.deleteBtn} onPress={() => handleDelete(deck)} hitSlop={8}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🎴 Biblioteca de mazos</Text>
        <Pressable style={styles.importBtn} onPress={() => setShowImport(true)}>
          <Text style={styles.importBtnText}>📥 Importar lista</Text>
        </Pressable>
        <Pressable style={styles.importBtn} onPress={() => setShowStateImport(true)}>
          <Text style={styles.importBtnText}>🧩 Importar JSON</Text>
        </Pressable>
      </View>

      <View style={styles.selectedBox}>
        <Text style={styles.selectedTitle}>Partida actual</Text>
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>Tú:</Text>
          <Text style={[styles.selectedName, !player1Deck && styles.selectedMissing]}>
            {player1Deck?.name ?? 'sin mazo'}
          </Text>
        </View>
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>Rival:</Text>
          <Text style={[styles.selectedName, !player2Deck && styles.selectedMissing]}>
            {player2Deck?.name ?? 'sin mazo'}
          </Text>
        </View>
        <Pressable
          style={[styles.startBtn, !(player1Deck && player2Deck) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!(player1Deck && player2Deck)}
        >
          <Text style={styles.startBtnText}>
            {player1Deck && player2Deck ? '⚔️ Iniciar partida' : 'Falta un mazo para empezar'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Tus mazos ({customDecks.length})</Text>
      {customDecks.length === 0 ? (
        <Text style={styles.emptyText}>
          Todavía no guardaste mazos. Importá una lista o esperá al próximo guardado.
        </Text>
      ) : (
        customDecks.map(deck => renderDeckRow(deck, true))
      )}

      <DeckSelectorModal visible={showImport} onClose={() => setShowImport(false)} onImported={handleImported} />
      <StateImportModal
        visible={showStateImport}
        onClose={() => setShowStateImport(false)}
        onImported={state => {
          importGameState(state);
          setShowStateImport(false);
          router.replace('/');
        }}
        player1Deck={player1Deck}
        player2Deck={player2Deck}
      />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#F5F9FF',
    fontSize: 19,
    fontWeight: '800',
    flexShrink: 1,
  },
  importBtn: {
    backgroundColor: '#16213A',
    borderColor: '#2A3B5C',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  importBtnText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedBox: {
    backgroundColor: '#16213A',
    borderRadius: 14,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  selectedTitle: {
    color: '#C9D6EA',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  selectedLabel: {
    color: '#9FB2C8',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedName: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  selectedMissing: {
    color: '#9FB2C8',
    fontStyle: 'italic',
  },
  startBtn: {
    backgroundColor: '#4CC38A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  startBtnDisabled: {
    backgroundColor: '#2A3B5C',
  },
  startBtnText: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#F5F9FF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  deckRow: {
    backgroundColor: '#16213A',
    borderRadius: 12,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deckInfo: {
    flex: 1,
    gap: 3,
  },
  deckName: {
    color: '#F5F9FF',
    fontSize: 14,
    fontWeight: '700',
  },
  deckDescription: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  deckCounts: {
    color: '#C9D6EA',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  chooseBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chooseBtnText: {
    color: '#0B1220',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteBtn: {
    backgroundColor: '#3A1620',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  deleteBtnText: {
    color: '#FF7B80',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: '#9FB2C8',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
});