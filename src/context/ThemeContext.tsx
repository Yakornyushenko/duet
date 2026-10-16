import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { applyThemeAppIcon } from '@/services/appIcon';
import {
  colors,
  setActiveTheme,
  type AppColors,
  type ThemeName,
} from '@/theme/tokens';

const THEME_STORAGE_KEY = 'duet:theme';

type ThemeContextValue = {
  theme: ThemeName;
  colors: AppColors;
  themeTransitioning: boolean;
  setTheme: (theme: ThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeName>('rose');
  const [themeTransitioning, setThemeTransitioning] = useState(false);
  const [ready, setReady] = useState(false);
  const themeRef = useRef<ThemeName>('rose');

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (cancelled) return;
        const nextTheme: ThemeName = storedTheme === 'emerald' ? 'emerald' : 'rose';
        themeRef.current = nextTheme;
        setActiveTheme(nextTheme);
        setThemeState(nextTheme);
        void applyThemeAppIcon(nextTheme, true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(async (nextTheme: ThemeName) => {
    if (nextTheme === themeRef.current) return;

    setThemeTransitioning(true);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);

      themeRef.current = nextTheme;
      setActiveTheme(nextTheme);
      setThemeState(nextTheme);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await applyThemeAppIcon(nextTheme);
    } catch {
      throw new Error('Не удалось сохранить тему. Попробуйте ещё раз.');
    } finally {
      setThemeTransitioning(false);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors, themeTransitioning, setTheme }),
    [setTheme, theme, themeTransitioning],
  );

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
