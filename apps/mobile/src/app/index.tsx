import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { hasActiveGame } from '@pokemon-simulator/core';
import { useStorage } from '@/hooks/useStorage';
import { GameBoard } from '@/components/game-board';

/**
 * Game board tab — default landing surface (D-1). While no game is in progress
 * the screen shows the start/empty state: decks are selected on the Bibliotheca
 * tab (S4.3), and once both decks are chosen "Iniciar partida" calls the core
 * store `startGame` (E-1 — will-start → place → swap → reset all flow through
 * core `gameStore` actions, and autosave restores the exact state on relaunch
 * via core hydration, E-2).
 */
export default function BoardScreen() {
  const { store } = useStorage();
  const router = useRouter();
  const gameState = store(s => s.gameState);
  const player1Deck = store(s => s.player1Deck);
  const player2Deck = store(s => s.player2Deck);
  const startGame = store(s => s.startGame);

  const inProgress = hasActiveGame(gameState);
  const decksReady = Boolean(player1Deck && player2Deck);

  if (inProgress) {
    return <GameBoard />;
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.title}>Bienvenido al Board Editor</Text>
      <Text style={styles.subtitle}>
        Seleccioná un mazo para cada jugador y comenzá a configurar escenarios.
      </Text>
      {decksReady ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => startGame()} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>⚔️ Iniciar partida</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/decks')} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>🎴 Seleccionar mazos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#0B1220',
  },
  title: {
    color: '#F5F9FF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9FB2C8',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#0B1220',
    fontSize: 15,
    fontWeight: '800',
  },
});