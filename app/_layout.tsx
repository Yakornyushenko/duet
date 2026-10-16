import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppProvider, useApp } from '@/context/AppContext';
import { DesktopHeader } from '@/components/DesktopHeader';
import { DialogProvider } from '@/context/DialogContext';
import { ReminderProvider } from '@/context/ReminderContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const publicRoutes = new Set(['auth', 'privacy', 'delete-account', 'email-confirmed']);

function RootNavigator() {
  const { initializing, user } = useApp();
  const { colors, theme, themeTransitioning } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const router = useRouter();
  const segments = useSegments();
  const rootSegment = segments[0];

  useEffect(() => {
    if (initializing || user || (rootSegment && publicRoutes.has(rootSegment))) return;
    router.replace('/auth');
  }, [initializing, rootSegment, router, user]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        key={theme}
        screenOptions={{
          headerShown: Boolean(user && isDesktop),
          header: () => <DesktopHeader />,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      />
      {themeTransitioning ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Применяем тему"
          accessibilityViewIsModal
          style={[styles.themeLoader, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.themeLoaderText, { color: colors.secondary }]}>Применяем тему…</Text>
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DialogProvider>
          <AppProvider>
            <ReminderProvider>
              <RootNavigator />
            </ReminderProvider>
          </AppProvider>
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  themeLoader: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  themeLoaderText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
});
