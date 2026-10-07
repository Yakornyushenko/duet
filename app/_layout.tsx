import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { AppProvider, useApp } from '@/context/AppContext';
import { DesktopHeader } from '@/components/DesktopHeader';
import { DialogProvider } from '@/context/DialogContext';
import { ReminderProvider } from '@/context/ReminderContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';

const publicRoutes = new Set(['auth', 'privacy', 'delete-account', 'email-confirmed']);

function RootNavigator() {
  const { initializing, user } = useApp();
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
        screenOptions={{
          headerShown: Boolean(user && isDesktop),
          header: () => <DesktopHeader />,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DialogProvider>
        <AppProvider>
          <ReminderProvider>
            <RootNavigator />
          </ReminderProvider>
        </AppProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
