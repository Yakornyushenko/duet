import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';
import { getEmailConfirmationError } from '@/utils/authLink';

const duetLogo = require('../assets/duet-birds.png') as ReturnType<typeof Image.resolveAssetSource>;

export default function EmailConfirmedScreen() {
  const [confirmationError, setConfirmationError] = useState<string | null>();

  useEffect(() => {
    void Linking.getInitialURL()
      .then((url) => setConfirmationError(getEmailConfirmationError(url)))
      .catch(() => setConfirmationError(null));
  }, []);

  const checking = confirmationError === undefined;
  const failed = Boolean(confirmationError);
  const title = checking ? 'Проверяем подтверждение' : failed ? 'Почта не подтверждена' : 'Почта подтверждена';

  return (
    <AppScreen scroll={false} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `${title} — Duet` }} />

      <View style={styles.brandRow}>
        <Image source={duetLogo} resizeMode="contain" style={styles.logo} accessible={false} />
        <Text style={styles.brand}>Duet</Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.statusIcon, failed && styles.failureIcon]}>
          <Text style={styles.statusIconText}>{checking ? '…' : failed ? '!' : '✓'}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>
          {checking
            ? 'Пожалуйста, подождите.'
            : confirmationError ?? 'Теперь вы можете вернуться в приложение Duet и войти с вашим email и паролем.'}
        </Text>
        {!checking ? <Text style={styles.hint}>Эту страницу можно закрыть.</Text> : null}
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
    width: 128,
    height: 96,
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
  statusIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.primary,
  },
  failureIcon: {
    backgroundColor: colors.danger,
  },
  statusIconText: {
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
