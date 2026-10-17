import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type BackgroundPattern = 'solid' | 'hearts' | 'stars' | 'constellation' | 'heartsSparkles';

const BACKGROUND_PATTERN_STORAGE_KEY = 'duet:background-pattern';

type BackgroundContextValue = {
  backgroundPattern: BackgroundPattern;
  setBackgroundPattern: (pattern: BackgroundPattern) => Promise<void>;
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

export function BackgroundProvider({ children }: PropsWithChildren) {
  const [backgroundPattern, setBackgroundPatternState] = useState<BackgroundPattern>('solid');

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(BACKGROUND_PATTERN_STORAGE_KEY).then((storedPattern) => {
      if (cancelled) return;
      if (
        storedPattern === 'hearts' ||
        storedPattern === 'stars' ||
        storedPattern === 'constellation' ||
        storedPattern === 'heartsSparkles'
      ) {
        setBackgroundPatternState(storedPattern);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setBackgroundPattern = useCallback(async (pattern: BackgroundPattern) => {
    await AsyncStorage.setItem(BACKGROUND_PATTERN_STORAGE_KEY, pattern);
    setBackgroundPatternState(pattern);
  }, []);

  const value = useMemo(
    () => ({ backgroundPattern, setBackgroundPattern }),
    [backgroundPattern, setBackgroundPattern],
  );

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground(): BackgroundContextValue {
  const context = useContext(BackgroundContext);
  if (!context) throw new Error('useBackground must be used within BackgroundProvider');
  return context;
}
