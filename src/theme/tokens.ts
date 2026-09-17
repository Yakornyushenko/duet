import { Platform } from 'react-native';

export const colors = {
  background: '#FFF8F3',
  surface: '#FFFFFF',
  primary: '#E85D75',
  primaryPressed: '#D94A65',
  secondary: '#6E405A',
  soft: '#F6D6CC',
  softRose: '#FCE9E4',
  text: '#201A1B',
  muted: '#73686B',
  border: '#EDE3DF',
  success: '#4F7C70',
  danger: '#B94355',
  white: '#FFFFFF',
  overlay: 'rgba(32, 26, 27, 0.42)',
} as const;

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
    shadowColor: colors.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 2 },
  default: {
    boxShadow: '0 8px 24px rgba(110, 64, 90, 0.08)',
  },
});
