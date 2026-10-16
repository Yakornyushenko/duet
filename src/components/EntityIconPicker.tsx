import { AppIcon } from '@/components/AppIcon';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, createThemedStyles, radii, spacing, typography } from '@/theme/tokens';
import { EntityIcon } from '@/types/domain';
import { entityIconGroups, entityIconLabels, entityIcons, EntityIconKind } from '@/utils/entityIcons';

export function EntityIconPicker({ kind, value, onChange, disabled = false }: {
  kind: EntityIconKind;
  value: EntityIcon;
  onChange: (value: EntityIcon) => void;
  disabled?: boolean;
}) {
  const { isTablet } = useResponsiveLayout();
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
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress, reduceMotion]);

  // Keep a legacy selection available even if it belonged to the old shared set.
  const group = entityIconGroups[kind];
  const icons = group.includes(value) ? [...group] : [value, ...group];
  const firstRow = icons.slice(0, 5);
  const extraIcons = icons.slice(5);

  const renderIcon = (icon: EntityIcon) => (
    <View key={icon} style={styles.cell}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={entityIconLabels[icon]}
        accessibilityState={{ checked: value === icon, disabled }}
        disabled={disabled}
        onPress={() => onChange(icon)}
        style={({ pressed }) => [styles.choice, value === icon && styles.selected, pressed && styles.pressed]}
      >
        <AppIcon name={entityIcons[icon]} size={24} color={value === icon ? colors.onPrimary : colors.primary} />
      </Pressable>
    </View>
  );

  return <View style={styles.field}>
    <Text style={styles.label}>Иконка</Text>
    <View>
      <View style={[styles.grid, isTablet && styles.wideGrid]}>{firstRow.map(renderIcon)}</View>
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
          <View style={[styles.grid, isTablet && styles.wideGrid]}>{extraIcons.map(renderIcon)}</View>
        </Animated.View>
      </Animated.View>
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      disabled={disabled}
      onPress={() => setExpanded((current) => !current)}
      style={[styles.toggle, isTablet && styles.wideToggle]}
    >
      <Text style={styles.toggleText}>{expanded ? 'Скрыть иконки' : 'Ещё иконки'}</Text>
      <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
    </Pressable>
  </View>;
}

const styles = createThemedStyles({
  field: { gap: spacing.sm },
  label: { ...typography.label, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  wideGrid: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  extraContent: { position: 'absolute', top: 0, left: 0, right: 0 },
  cell: { width: '20%', padding: 3 },
  choice: { minHeight: 44, aspectRatio: 1, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softAccent },
  selected: { backgroundColor: colors.primary },
  pressed: { opacity: 0.75 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  wideToggle: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  toggleText: { ...typography.label, color: colors.primary },
});
