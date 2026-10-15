import { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { colors, radii } from '@/theme/tokens';

export function BackButton({ onPress, disabled = false, accessibilityLabel = 'Назад' }: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback((value: number) => {
    scale.stopAnimation();
    Animated.spring(scale, {
      toValue: value,
      speed: 28,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.frame, disabled && styles.disabled, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onHoverIn={() => animateTo(1.05)}
        onHoverOut={() => animateTo(1)}
        onPressIn={() => animateTo(0.9)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <AppIcon name="chevron-back" size={24} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 44, height: 44 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.softRose },
  pressed: { backgroundColor: colors.soft },
  disabled: { opacity: 0.45 },
});
