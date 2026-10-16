import { ImageStyle, Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export type ThemeName = 'rose' | 'emerald' | 'honey' | 'sapphire' | 'terracotta' | 'graphite';

export type AppColors = {
  background: string;
  surface: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
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
    onPrimary: '#FFFEFE',
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
    white: '#FDFDFD',
    overlay: 'rgba(32, 26, 27, 0.42)',
  },
  emerald: {
    background: '#F6FBF8',
    surface: '#FFFFFF',
    primary: '#008668',
    primaryPressed: '#006F53',
    onPrimary: '#FFFEFE',
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
  honey: {
    background: '#FFF8E6',
    surface: '#FFFCF4',
    primary: '#D79A24',
    primaryPressed: '#B97812',
    onPrimary: '#FFFEFE',
    secondary: '#8C6A2F',
    secondaryPressed: '#E7C36E',
    soft: '#F2D58A',
    softAccent: '#FFF0C4',
    text: '#2B2419',
    muted: '#74664F',
    border: '#EADCB7',
    success: '#7A7542',
    danger: '#B94355',
    dangerSoft: '#FBE9EC',
    dangerPressed: '#F4D2D8',
    white: '#FFFFFF',
    overlay: 'rgba(43, 36, 25, 0.42)',
  },
  sapphire: {
    background: '#F5F8FF',
    surface: '#FFFFFF',
    primary: '#2563EB',
    primaryPressed: '#1D4ED8',
    onPrimary: '#FFFEFE',
    secondary: '#35558A',
    secondaryPressed: '#B9CCF7',
    soft: '#DCE8FF',
    softAccent: '#EBF2FF',
    text: '#172033',
    muted: '#68758C',
    border: '#D9E2F2',
    success: '#3E6F78',
    danger: '#B94355',
    dangerSoft: '#FBE9EC',
    dangerPressed: '#F4D2D8',
    white: '#FFFFFF',
    overlay: 'rgba(23, 32, 51, 0.42)',
  },
  terracotta: {
    background: '#FFF5EE',
    surface: '#FFFCF9',
    primary: '#D65F45',
    primaryPressed: '#B94732',
    onPrimary: '#FFFEFE',
    secondary: '#7C493C',
    secondaryPressed: '#E7B4A4',
    soft: '#F6D2C4',
    softAccent: '#FBE7DE',
    text: '#2D211D',
    muted: '#7A6961',
    border: '#EBD8CF',
    success: '#6F7A50',
    danger: '#B94355',
    dangerSoft: '#FBE9EC',
    dangerPressed: '#F4D2D8',
    white: '#FFFFFF',
    overlay: 'rgba(45, 33, 29, 0.42)',
  },
  graphite: {
    background: '#0D0D0F',
    surface: '#1C1C1E',
    primary: '#F2F2F7',
    primaryPressed: '#C7C7CC',
    onPrimary: '#111113',
    secondary: '#D1D1D6',
    secondaryPressed: '#48484A',
    soft: '#3A3A3C',
    softAccent: '#2C2C2E',
    text: '#F5F5F7',
    muted: '#98989D',
    border: '#38383A',
    success: '#AEAEB2',
    danger: '#FF453A',
    dangerSoft: '#3A2022',
    dangerPressed: '#55292D',
    white: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.68)',
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

for (const [token, value] of Object.entries(themePalettes.rose) as [keyof AppColors, string][]) {
  colorTokenByValue.set(value.toLowerCase(), token);
}

const roseWebShadow = '0 8px 24px rgba(110, 64, 90, 0.08)';
const emeraldWebShadow = '0 8px 24px rgba(54, 95, 84, 0.10)';
const honeyWebShadow = '0 8px 24px rgba(140, 106, 47, 0.12)';
const sapphireWebShadow = '0 8px 24px rgba(53, 85, 138, 0.12)';
const terracottaWebShadow = '0 8px 24px rgba(124, 73, 60, 0.12)';
const graphiteWebShadow = '0 8px 24px rgba(0, 0, 0, 0.32)';

function resolveThemeValues(value: unknown, theme: ThemeName): unknown {
  if (typeof value === 'string') {
    const colorToken = colorTokenByValue.get(value.toLowerCase());
    if (colorToken) return themePalettes[theme][colorToken];
    if (
      value === roseWebShadow ||
      value === emeraldWebShadow ||
      value === honeyWebShadow ||
      value === sapphireWebShadow ||
      value === terracottaWebShadow ||
      value === graphiteWebShadow
    ) {
      if (theme === 'emerald') return emeraldWebShadow;
      if (theme === 'honey') return honeyWebShadow;
      if (theme === 'sapphire') return sapphireWebShadow;
      if (theme === 'terracotta') return terracottaWebShadow;
      if (theme === 'graphite') return graphiteWebShadow;
      return roseWebShadow;
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
