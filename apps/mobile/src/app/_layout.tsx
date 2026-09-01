import '@/lib/crypto-shim';

import { DarkTheme, DefaultTheme, Tabs, ThemeProvider } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { StorageProvider } from '@/components/storage-provider';
import { useHydrated } from '@/hooks/useStorage';

// Hydration gate (D-2): the shell renders a lightweight skeleton until the
// AsyncStorage hydration resolves (skeleton → hydrate → render, C-3), then the
// four expo-router tabs mount. The board is the default landing tab (D-1).
// The store/adapters are session singletons, so background/resume never
// re-initialize or re-hydrate (D-2). This surface has NO coach entry point
// (D-3); browser-only reload guards are deliberately absent (D-4).

function BootSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando escenario guardado">
      <Text style={styles.skeletonTitle}>🃏 Pokemon TCG — Board Editor</Text>
      <ActivityIndicator color="#208AEF" />
      <Text style={styles.skeletonSubtitle}>Cargando escenario guardado…</Text>
    </View>
  );
}

function Shell() {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <BootSkeleton />;
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#208AEF' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tablero',
          tabBarIcon: () => <Text style={styles.tabIcon}>🃏</Text>,
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Biblioteca',
          tabBarIcon: () => <Text style={styles.tabIcon}>🂠</Text>,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Exportar',
          tabBarIcon: () => <Text style={styles.tabIcon}>📤</Text>,
        }}
      />
      <Tabs.Screen
        name="scenarios"
        options={{
          title: 'Escenarios',
          tabBarIcon: () => <Text style={styles.tabIcon}>📜</Text>,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StorageProvider>
        <Shell />
      </StorageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#0B1220',
  },
  skeletonTitle: {
    color: '#F5F9FF',
    fontSize: 18,
    fontWeight: '700',
  },
  skeletonSubtitle: {
    color: '#9FB2C8',
    fontSize: 13,
  },
  tabIcon: {
    fontSize: 16,
  },
});