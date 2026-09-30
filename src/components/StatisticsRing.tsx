import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '@/theme/tokens';
import { getRingSegment } from '@/utils/statisticsRing';

type Segment = { label: string; count: number; color: string };

function RingSegment({ start, end, middle, color, selected, dimmed, size, reduceMotion }: {
  start: number; end: number; middle: number; color: string; selected: boolean; dimmed: boolean; size: number; reduceMotion: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const emphasis = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    const timing = { duration: reduceMotion ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    const animation = Animated.parallel([
      Animated.timing(progress, { ...timing, toValue: selected ? 1 : 0 }),
      Animated.timing(emphasis, { ...timing, toValue: dimmed ? 1 : 0 }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [selected, dimmed, reduceMotion, progress, emphasis]);

  // Animate a native layer, not SVG shorthand props: geometry and fading are
  // driven together on the UI thread, without per-frame JS/SVG updates.
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
    opacity: emphasis.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(middle) * 8 * size / 300] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(middle) * 8 * size / 300] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
    ],
  }]}>
    <Svg width="100%" height="100%" viewBox="0 0 300 300" accessible={false}>
      <Path d={ringPath(start, end)} fill={color} />
    </Svg>
  </Animated.View>;
}

// Two arcs per edge also handle a single category occupying the entire circle.
function ringPath(start: number, end: number) {
  const point = (radius: number, angle: number) => `${150 + radius * Math.cos(angle)},${150 + radius * Math.sin(angle)}`;
  const middle = (start + end) / 2;
  return `M ${point(126, start)} A 126 126 0 0 1 ${point(126, middle)} A 126 126 0 0 1 ${point(126, end)}
    L ${point(94, end)} A 94 94 0 0 0 ${point(94, middle)} A 94 94 0 0 0 ${point(94, start)} Z`;
}

export function StatisticsRing({ segments }: { segments: Segment[] }) {
  const [selection, setSelection] = useState<number | null>(null);
  const [ringSize, setRingSize] = useState(300);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const selected = selection !== null && segments[selection]?.count > 0 ? selection : null;
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const visibleCount = segments.filter((segment) => segment.count > 0).length;
  let cursor = -Math.PI / 2;

  return <View style={styles.card}>
    <Text style={styles.title}>Моменты вместе</Text>
    <Pressable style={styles.ring} accessible={false}
      onLayout={(event) => setRingSize(event.nativeEvent.layout.width)}
      onPress={(event) => {
        const { locationX, locationY } = event.nativeEvent;
        const index = getRingSegment(locationX, locationY, ringSize, segments.map((segment) => segment.count));
        setSelection(index === selected ? null : index);
      }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {total === 0 && <Svg width="100%" height="100%" viewBox="0 0 300 300" accessible={false}>
        <Circle cx={150} cy={150} r={110} fill="none" stroke={colors.softRose} strokeWidth={32} />
      </Svg>}
        {segments.map((segment, index) => {
          if (!segment.count || !total) return null;
          const sweep = segment.count / total * Math.PI * 2;
          const gap = visibleCount > 1 ? Math.min(0.035, sweep * 0.18) : 0;
          const start = cursor; cursor += sweep;
          const middle = start + sweep / 2;
          return <RingSegment key={segment.label + index} start={start + gap / 2} end={cursor - gap / 2}
            middle={middle} color={segment.color} selected={selected === index}
            dimmed={selected !== null && selected !== index} size={ringSize} reduceMotion={reduceMotion} />;
        })}
      </View>
      <Pressable style={styles.center} accessibilityRole="button" accessibilityLiveRegion="polite"
        accessibilityLabel={`${selected === null ? 'Моментов вместе' : segments[selected].label}: ${selected === null ? total : segments[selected].count}. Показать общий итог`}
        onPress={() => setSelection(null)}>
        <View pointerEvents="none" style={styles.centerContent}>
          <Text style={styles.number}>{selected === null ? total : segments[selected].count}</Text>
          <Text style={styles.centerLabel} numberOfLines={3}>{selected === null ? 'Моментов вместе' : segments[selected].label}</Text>
        </View>
      </Pressable>
    </Pressable>
    {total === 0 && <Text style={styles.empty}>В этом периоде пока нет завершённых событий и желаний.</Text>}
    <View style={styles.legend}>
      {segments.map((segment, index) => <Pressable key={segment.label + index} accessibilityRole="button"
        accessibilityLabel={`${segment.label}: ${segment.count}`} accessibilityState={{ selected: selected === index, disabled: segment.count === 0 }}
        disabled={segment.count === 0} onPress={() => setSelection(selected === index ? null : index)}
        style={({ pressed }) => [styles.row, selected === index && styles.selectedRow, pressed && { opacity: 0.7 }]}>
        <View style={[styles.dot, { backgroundColor: segment.color }]} />
        <Text style={styles.label}>{segment.label}</Text>
        <Text style={styles.count}>{segment.count}</Text>
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  title: { ...typography.sectionTitle, color: colors.text },
  ring: { width: '100%', maxWidth: 300, aspectRatio: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', width: '56%', height: 120 },
  centerContent: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  number: { fontSize: 46, fontWeight: '700', color: colors.text },
  centerLabel: { ...typography.caption, color: colors.muted, textAlign: 'center' },
  empty: { ...typography.caption, color: colors.muted, textAlign: 'center' },
  legend: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, padding: spacing.sm, borderRadius: radii.md },
  selectedRow: { backgroundColor: colors.softRose },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { ...typography.body, color: colors.text, flex: 1 },
  count: { ...typography.cardTitle, color: colors.secondary },
});
