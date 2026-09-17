import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

const birds = require('../../assets/duet-birds.png') as ReturnType<typeof Image.resolveAssetSource>;

export function LoadingSplash() {
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const illustrationScale = useRef(new Animated.Value(0.82)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyOffset = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(illustrationOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(illustrationScale, {
        toValue: 1,
        damping: 14,
        stiffness: 95,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(copyOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(copyOffset, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [copyOffset, copyOpacity, illustrationOpacity, illustrationScale]);

  return (
    <View style={styles.screen}>
      <Animated.Image
        source={birds}
        resizeMode="contain"
        style={[
          styles.illustration,
          { opacity: illustrationOpacity, transform: [{ scale: illustrationScale }] },
        ]}
      />
      <Animated.View style={{ opacity: copyOpacity, transform: [{ translateY: copyOffset }] }}>
        <Text style={styles.title}>Duet</Text>
        <Text style={styles.subtitle}>Навстречу друг другу</Text>
      </Animated.View>
      <ActivityIndicator color={colors.primary} style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  illustration: {
    width: 292,
    height: 292,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 42,
    lineHeight: 48,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  indicator: {
    marginTop: spacing.xxl,
  },
});
