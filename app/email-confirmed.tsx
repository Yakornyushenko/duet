import { Stack } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

const duetLogo = require('../assets/duet-birds.png') as ReturnType<typeof Image.resolveAssetSource>;

export default function EmailConfirmedScreen() {
  return (
    <AppScreen scroll={false} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Почта подтверждена — Duet' }} />

      <View style={styles.brandRow}>
        <Image source={duetLogo} resizeMode="contain" style={styles.logo} accessible={false} />
        <Text style={styles.brand}>Duet</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.title}>Почта подтверждена</Text>
        <Text style={styles.body}>
          Теперь вы можете вернуться в приложение Duet и войти с вашим email и паролем.
        </Text>
        <Text style={styles.hint}>Эту страницу можно закрыть.</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  brandRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 96,
    height: 72,
  },
  brand: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  card: {
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xxxl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadow,
  },
  successIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.primary,
  },
  successIconText: {
    color: colors.white,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
});
