import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, createThemedStyles, radii, spacing, typography } from '@/theme/tokens';

type Option<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({ options, value, onChange, disabled = false }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.selected,
              pressed && styles.pressed,
              pressed && isSelected && styles.selectedPressed,
              disabled && styles.disabled,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = createThemedStyles({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.softAccent,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.soft,
  },
  selectedPressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  selectedLabel: {
    color: colors.white,
    fontWeight: '600',
  },
});
