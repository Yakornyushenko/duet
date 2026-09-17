import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
};

const backgrounds: Record<ButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.soft,
  ghost: 'transparent',
  danger: colors.softRose,
};

const textColors: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.secondary,
  ghost: colors.primary,
  danger: colors.danger,
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityHint,
}: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed && variant === 'primary' ? colors.primaryPressed : backgrounds[variant],
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <Text style={[styles.label, { color: textColors[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    ...typography.body,
    fontWeight: '600',
  },
});
