import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

type AppInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  { label, error, style, ...props },
  ref,
) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
