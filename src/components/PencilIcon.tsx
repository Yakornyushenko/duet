import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export function PencilIcon() {
  return <View style={styles.frame} pointerEvents="none" accessible={false}>
    <View style={styles.pencil}>
      <View style={styles.body} />
      <View style={styles.eraserBand} />
      <View style={[styles.tipEdge, styles.tipLeft]} />
      <View style={[styles.tipEdge, styles.tipRight]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  frame: {
    width: 40, height: 40, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.softRose,
  },
  pencil: {
    width: 10, height: 28,
    transform: [{ rotate: '45deg' }],
  },
  body: {
    position: 'absolute', top: 0, left: 0,
    width: 10, height: 21,
    borderWidth: 1.8, borderColor: colors.primary,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  eraserBand: {
    position: 'absolute', top: 6, left: 1,
    width: 8, height: 1.8, backgroundColor: colors.primary,
  },
  tipEdge: {
    position: 'absolute', top: 19.4,
    width: 1.8, height: 9, borderRadius: 0.9,
    backgroundColor: colors.primary,
  },
  tipLeft: { left: 2, transform: [{ rotate: '-28deg' }] },
  tipRight: { right: 2, transform: [{ rotate: '28deg' }] },
});
