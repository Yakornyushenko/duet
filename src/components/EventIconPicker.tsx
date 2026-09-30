import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const [extraHeight, setExtraHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: reduceMotion ? 0 : 280,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // Height must move the content below the picker too.
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress, reduceMotion]);
  // A previously selected extra icon stays visible even in the compact row.
  const firstRow = icons.slice(0, 5);
  if (!firstRow.includes(value)) firstRow[4] = value;
  const extraIcons = icons.filter((icon) => !firstRow.includes(icon));

  const renderIcon = (icon: DateEventIcon) => <View key={icon} style={styles.cell}>
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
      </View>;

  return <View style={styles.field}>
    <Text style={styles.label}>Значок</Text>
    <View>
      <View style={styles.grid}>{firstRow.map(renderIcon)}</View>
      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        style={{ overflow: 'hidden', height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, extraHeight] }) }}
      >
        <Animated.View
          onLayout={(event) => setExtraHeight(event.nativeEvent.layout.height)}
          style={[styles.extraContent, {
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          }]}
        >
          <View style={styles.grid}>{extraIcons.map(renderIcon)}</View>
        </Animated.View>
      </Animated.View>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} disabled={disabled}
      onPress={() => {
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
  extraContent: { position: 'absolute', top: 0, left: 0, right: 0 },
  cell: { width: '20%', padding: 3 },
  choice: { minHeight: 44, aspectRatio: 1, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softRose },
  selected: { backgroundColor: colors.primary },
  pressed: { opacity: 0.75 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  toggleText: { ...typography.label, color: colors.primary },
});
