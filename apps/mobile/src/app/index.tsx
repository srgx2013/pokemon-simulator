import { StyleSheet, Text, View } from 'react-native';

/**
 * Game board — default landing tab (D-1). Slice 3 ships the placeholder;
 * the full `GameBoard` (E-1/E-2) lands in slice 4 on top of the hydrated
 * store exposed by `useStorage()`.
 */
export default function BoardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tablero</Text>
      <Text style={styles.subtitle}>El tablero de juego llega en una próxima actualización.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});