import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateEventIcon } from '@/types/domain';
import { eventIcons, iconLabels } from '@/utils/eventIcons';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const icons = Object.keys(eventIcons) as DateEventIcon[];

export function EventIconPicker({ value, onChange, disabled = false }: {
  value: DateEventIcon;
  onChange: (value: DateEventIcon) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // A previously selected extra icon stays visible even in the compact row.
  const firstRow = icons.slice(0, 5);
  if (!firstRow.includes(value)) firstRow[4] = value;
  const visible = expanded ? [...firstRow, ...icons.filter((icon) => !firstRow.includes(icon))] : firstRow;

  return <View style={styles.field}>
    <Text style={styles.label}>Значок</Text>
    <View style={styles.grid}>
      {visible.map((icon) => <View key={icon} style={styles.cell}>
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={iconLabels[icon]}
          accessibilityState={{ checked: value === icon, disabled }}
          disabled={disabled}
          onPress={() => onChange(icon)}
          style={({ pressed }) => [styles.choice, value === icon && styles.selected, pressed && styles.pressed]}
        >
          <Ionicons name={eventIcons[icon]} size={24} color={value === icon ? colors.white : colors.primary} />
        </Pressable>
      </View>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} disabled={disabled}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((current) => !current);
      }} style={styles.toggle}>
      <Text style={styles.toggleText}>{expanded ? 'Скрыть значки' : 'Ещё значки'}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { ...typography.label, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: '20%', padding: 3 },
  choice: { minHeight: 44, aspectRatio: 1, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softRose },
  selected: { backgroundColor: colors.primary },
  pressed: { opacity: 0.75 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  toggleText: { ...typography.label, color: colors.primary },
});
