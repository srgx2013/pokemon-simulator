import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { STORAGE_KEYS } from '@pokemon-simulator/core';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

// Metro workspace-resolution smoke probe (design §2b / task S3.2): importing a
// runtime value from `@pokemon-simulator/core` proves the workspace package's
// `exports` map and `packages/core` TypeScript source resolve through Metro and
// transpile via babel-preset-expo. The value keys the overlay so the import is
// a real bundle edge (not tree-shaken). Replaced by the hydration gate in S3.3.
const workspaceSmokeKey = STORAGE_KEYS.dataVersion;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay key={workspaceSmokeKey} />
      <AppTabs />
    </ThemeProvider>
  );
}