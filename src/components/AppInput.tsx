import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

type AppInputProps = TextInputProps & {
  label: string;
  error?: string;
  rightElement?: ReactNode;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  { label, error, rightElement, style, ...props },
  ref,
) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          style={[
            styles.input,
            rightElement != null ? styles.inputWithRightElement : undefined,
            error && styles.inputError,
            style,
          ]}
          {...props}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
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
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
  },
  inputWithRightElement: {
    paddingRight: 56,
  },
  rightElement: {
    position: 'absolute',
    top: 4,
    right: 4,
    bottom: 4,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
