import { StyleSheet, Text, View } from 'react-native';

/**
 * Scenario editor tab (F-3). Slice 3 ships the placeholder; save/load/delete
 * of named scenarios lands in slice 4, seeded by core `hydrate()` read-back.
 */
export default function ScenariosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escenarios</Text>
      <Text style={styles.subtitle}>Escenarios guardados disponibles próximamente.</Text>
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