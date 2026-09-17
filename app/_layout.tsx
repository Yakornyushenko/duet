import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/context/AppContext';
import { DialogProvider } from '@/context/DialogContext';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DialogProvider>
        <AppProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade_from_bottom',
            }}
          />
        </AppProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
