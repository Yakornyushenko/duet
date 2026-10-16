import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { ThemeName } from '@/theme/tokens';

const iconNames: Record<ThemeName, string | null> = {
  rose: null,
  emerald: 'emerald',
};

export async function applyThemeAppIcon(theme: ThemeName, changeOnBackground = false): Promise<void> {
  if (Platform.OS === 'web' || Constants.expoVersion) return;

  try {
    const { getAppIcon, setAppIcon } = await import('expo-awesome-app-icon');
    const nextIcon = iconNames[theme];

    if (getAppIcon() === nextIcon) return;

    await setAppIcon(nextIcon, { deferUntilBackground: changeOnBackground });
  } catch (error) {
    console.warn('Не удалось синхронизировать иконку приложения с темой.', error);
  }
}
