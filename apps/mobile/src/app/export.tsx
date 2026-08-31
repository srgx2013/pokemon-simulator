import { StyleSheet, Text, View } from 'react-native';

/**
 * Export tab (F-1/F-2). Slice 3 ships the placeholder; clipboard/share export
 * and import land in slice 4 via `lib/clipboard.ts` + the core exporter.
 */
export default function ExportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exportar</Text>
      <Text style={styles.subtitle}>Exportación e importación disponibles próximamente.</Text>
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