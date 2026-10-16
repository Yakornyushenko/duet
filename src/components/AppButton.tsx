import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, createThemedStyles, radii, spacing, typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
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
  const [pressed, setPressed] = useState(false);
  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.soft,
    ghost: 'transparent',
    danger: colors.dangerSoft,
    dangerOutline: 'transparent',
  };
  const pressedBackgrounds: Record<ButtonVariant, string> = {
    primary: colors.primaryPressed,
    secondary: colors.secondaryPressed,
    ghost: colors.softAccent,
    danger: colors.dangerPressed,
    dangerOutline: colors.dangerSoft,
  };
  const textColors: Record<ButtonVariant, string> = {
    primary: colors.white,
    secondary: colors.secondary,
    ghost: colors.primary,
    danger: colors.danger,
    dangerOutline: colors.danger,
  };
  const inactive = disabled || loading;
  const foregroundColor = inactive ? colors.muted : textColors[variant];
  const backgroundColor = inactive
    ? variant === 'ghost' || variant === 'dangerOutline' ? 'transparent' : colors.border
    : pressed ? pressedBackgrounds[variant] : backgrounds[variant];
  const outlined = variant === 'dangerOutline';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        setPressed(false);
        onPress();
      }}
      style={[
        styles.base,
        {
          backgroundColor,
          borderColor: outlined ? inactive ? colors.border : colors.danger : 'transparent',
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        fullWidth && styles.fullWidth,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = createThemedStyles({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    ...typography.body,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontWeight: '600',
  },
});
