import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

type Option<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.option, isSelected && styles.selected, pressed && styles.pressed]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
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
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  selectedLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
});
