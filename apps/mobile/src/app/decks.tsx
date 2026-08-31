import { StyleSheet, Text, View } from 'react-native';

/**
 * Deck browser tab (E-3/E-4). Slice 3 ships the placeholder; presets, custom
 * deck CRUD and external-list resolution land in slice 4.
 */
export default function DecksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Biblioteca de mazos</Text>
      <Text style={styles.subtitle}>Mazos y cartas disponibles próximamente.</Text>
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