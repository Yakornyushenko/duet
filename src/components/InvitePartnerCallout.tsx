import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { useThemeImage } from '@/theme/images';
import { colors, createThemedStyles, radii, shadow, spacing, typography } from '@/theme/tokens';

type InvitePartnerCalloutProps = {
  onPress: () => void;
  description?: string;
};

export function InvitePartnerCallout({
  onPress,
  description = 'Создайте общее пространство для ваших дат, желаний и заметок.',
}: InvitePartnerCalloutProps) {
  const illustration = useThemeImage('invitePartner');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Пригласить партнёра"
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.callout, pressed && styles.pressed]}
    >
      <Image
        source={illustration}
        style={styles.illustration}
        resizeMode="contain"
        accessible={false}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>Пригласить партнёра</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <AppIcon name="chevron-forward" size={22} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = createThemedStyles({
  callout: {
    ...shadow,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  illustration: {
    width: 64,
    height: 64,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.onPrimary,
  },
  description: {
    ...typography.caption,
    color: colors.onPrimary,
    opacity: 0.88,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
