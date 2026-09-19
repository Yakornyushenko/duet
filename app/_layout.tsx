import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/context/AppContext';
import { DialogProvider } from '@/context/DialogContext';
import { ReminderProvider } from '@/context/ReminderContext';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DialogProvider>
        <AppProvider>
          <ReminderProvider>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade_from_bottom',
              }}
            />
          </ReminderProvider>
        </AppProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
