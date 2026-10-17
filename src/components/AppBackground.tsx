import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { AppIcon } from '@/components/AppIcon';
import { useBackground, type BackgroundPattern } from '@/context/BackgroundContext';
import { colors } from '@/theme/tokens';

type MotifPosition = {
  top: `${number}%`;
  left: `${number}%`;
  size: number;
  opacity: number;
};

const hearts: MotifPosition[] = [
  { top: '3%', left: '8%', size: 9, opacity: 0.13 },
  { top: '7%', left: '47%', size: 24, opacity: 0.08 },
  { top: '12%', left: '82%', size: 13, opacity: 0.12 },
  { top: '18%', left: '19%', size: 36, opacity: 0.07 },
  { top: '24%', left: '67%', size: 8, opacity: 0.14 },
  { top: '31%', left: '89%', size: 28, opacity: 0.08 },
  { top: '39%', left: '5%', size: 15, opacity: 0.11 },
  { top: '46%', left: '57%', size: 44, opacity: 0.06 },
  { top: '55%', left: '28%', size: 10, opacity: 0.13 },
  { top: '62%', left: '79%', size: 20, opacity: 0.09 },
  { top: '71%', left: '11%', size: 42, opacity: 0.06 },
  { top: '78%', left: '51%', size: 16, opacity: 0.1 },
  { top: '86%', left: '88%', size: 8, opacity: 0.14 },
  { top: '92%', left: '34%', size: 27, opacity: 0.08 },
];

const stars: MotifPosition[] = [
  { top: '4%', left: '17%', size: 11, opacity: 0.12 },
  { top: '9%', left: '69%', size: 20, opacity: 0.09 },
  { top: '15%', left: '88%', size: 8, opacity: 0.14 },
  { top: '23%', left: '37%', size: 15, opacity: 0.11 },
  { top: '29%', left: '73%', size: 9, opacity: 0.13 },
  { top: '36%', left: '8%', size: 19, opacity: 0.09 },
  { top: '43%', left: '91%', size: 13, opacity: 0.11 },
  { top: '52%', left: '46%', size: 8, opacity: 0.14 },
  { top: '60%', left: '18%', size: 14, opacity: 0.1 },
  { top: '67%', left: '76%', size: 22, opacity: 0.08 },
  { top: '75%', left: '6%', size: 9, opacity: 0.13 },
  { top: '82%', left: '54%', size: 17, opacity: 0.1 },
  { top: '91%', left: '86%', size: 11, opacity: 0.12 },
];

function Hearts() {
  return <>{hearts.map(({ size, ...position }, index) => (
    <AppIcon
      key={`heart-${index}`}
      name="heart-outline"
      size={size}
      color={colors.primary}
      style={[styles.motif, position]}
    />
  ))}</>;
}

function Stars() {
  return <>{stars.map(({ size, ...position }, index) => (
    <Text key={`star-${index}`} style={[styles.star, position, { color: colors.primary, fontSize: size, lineHeight: size + 3 }]}>
      ✦
    </Text>
  ))}</>;
}

function Constellation() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Line x1="9" y1="18" x2="25" y2="11" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="25" y1="11" x2="38" y2="23" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="38" y1="23" x2="29" y2="35" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="29" y1="35" x2="12" y2="29" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="62" y1="65" x2="77" y2="56" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="77" y1="56" x2="91" y2="68" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="91" y1="68" x2="82" y2="83" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      <Line x1="82" y1="83" x2="65" y2="78" stroke={colors.primary} strokeWidth="0.18" opacity="0.1" />
      {[[9, 18], [25, 11], [38, 23], [29, 35], [12, 29], [62, 65], [77, 56], [91, 68], [82, 83], [65, 78]].map(([cx, cy], index) => (
        <Circle key={`constellation-${index}`} cx={cx} cy={cy} r={index % 3 === 0 ? 0.55 : 0.36} fill={colors.primary} opacity="0.16" />
      ))}
    </Svg>
  );
}

export function AppBackground({ pattern }: { pattern?: BackgroundPattern }) {
  const { backgroundPattern } = useBackground();
  const activePattern = pattern ?? backgroundPattern;

  if (activePattern === 'solid') return null;

  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.background}>
      {activePattern === 'hearts' || activePattern === 'heartsSparkles' ? <Hearts /> : null}
      {activePattern === 'stars' || activePattern === 'heartsSparkles' ? <Stars /> : null}
      {activePattern === 'constellation' ? <Constellation /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  motif: {
    position: 'absolute',
  },
  star: {
    position: 'absolute',
    lineHeight: 24,
    textAlign: 'center',
  },
});
