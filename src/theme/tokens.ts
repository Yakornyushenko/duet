import { ImageStyle, Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export type ThemeName = 'rose' | 'emerald';

export type AppColors = {
  background: string;
  surface: string;
  primary: string;
  primaryPressed: string;
  secondary: string;
  secondaryPressed: string;
  soft: string;
  softAccent: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  danger: string;
  dangerSoft: string;
  dangerPressed: string;
  white: string;
  overlay: string;
};

export const themePalettes: Record<ThemeName, AppColors> = {
  rose: {
    background: '#FFF8F3',
    surface: '#FFFFFF',
    primary: '#E85D75',
    primaryPressed: '#D94A65',
    secondary: '#6E405A',
    secondaryPressed: '#EDC1B5',
    soft: '#F6D6CC',
    softAccent: '#FCE9E4',
    text: '#201A1B',
    muted: '#73686B',
    border: '#EDE3DF',
    success: '#4F7C70',
    danger: '#B94355',
    dangerSoft: '#FBE9EC',
    dangerPressed: '#F6D5D9',
    white: '#FFFFFF',
    overlay: 'rgba(32, 26, 27, 0.42)',
  },
  emerald: {
    background: '#F6FBF8',
    surface: '#FFFFFF',
    primary: '#008668',
    primaryPressed: '#006F53',
    secondary: '#365F54',
    secondaryPressed: '#B2DDCE',
    soft: '#CFE9DF',
    softAccent: '#E6F4EF',
    text: '#16221E',
    muted: '#66766F',
    border: '#DCE8E2',
    success: '#3D7768',
    danger: '#B94355',
    dangerSoft: '#FBE9EC',
    dangerPressed: '#F4D2D8',
    white: '#FFFFFF',
    overlay: 'rgba(22, 34, 30, 0.42)',
  },
};

let activeTheme: ThemeName = 'rose';

export function setActiveTheme(theme: ThemeName): void {
  activeTheme = theme;
}

export const colors = new Proxy(themePalettes.rose, {
  get: (_target, property: keyof AppColors) => themePalettes[activeTheme][property],
}) as AppColors;

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const colorTokenByValue = new Map<string, keyof AppColors>();

for (const palette of Object.values(themePalettes)) {
  for (const [token, value] of Object.entries(palette) as [keyof AppColors, string][]) {
    colorTokenByValue.set(value.toLowerCase(), token);
  }
}

const roseWebShadow = '0 8px 24px rgba(110, 64, 90, 0.08)';
const emeraldWebShadow = '0 8px 24px rgba(54, 95, 84, 0.10)';

function resolveThemeValues(value: unknown, theme: ThemeName): unknown {
  if (typeof value === 'string') {
    const colorToken = colorTokenByValue.get(value.toLowerCase());
    if (colorToken) return themePalettes[theme][colorToken];
    if (value === roseWebShadow || value === emeraldWebShadow) {
      return theme === 'emerald' ? emeraldWebShadow : roseWebShadow;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveThemeValues(item, theme));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveThemeValues(item, theme)]),
    );
  }

  return value;
}

export function createThemedStyles<T extends NamedStyles<T>>(styles: T): T {
  const cache = new Map<ThemeName, T>();

  return new Proxy(styles, {
    get: (_target, property: string | symbol) => {
      let resolvedStyles = cache.get(activeTheme);
      if (!resolvedStyles) {
        resolvedStyles = StyleSheet.create(resolveThemeValues(styles, activeTheme) as T) as T;
        cache.set(activeTheme, resolvedStyles);
      }
      return Reflect.get(resolvedStyles, property);
    },
  });
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  round: 999,
} as const;

export const typography = {
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.7,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: themePalettes.rose.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 2 },
  default: {
    boxShadow: roseWebShadow,
  },
});
