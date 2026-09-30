import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function NotesIcon() {
  return (
    <View style={styles.frame} accessible={false} pointerEvents="none">
      <View style={styles.board}>
        <View style={styles.paper}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.row}>
              <View style={styles.box}>
                {row < 3 && <View style={styles.check} />}
              </View>
              <View style={[styles.line, row === 3 && styles.shortLine]} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.loop} />
      <View style={styles.clip}><View style={styles.clipLine} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 28, height: 32 },
  board: {
    position: 'absolute', left: 2, right: 2, top: 5, bottom: 0,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 2,
    padding: 1.5,
  },
  paper: {
    flex: 1, borderWidth: 1, borderColor: colors.primary,
    paddingHorizontal: 2, paddingTop: 2, paddingBottom: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  box: {
    width: 3.5, height: 3.5, borderWidth: 0.8, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  check: {
    width: 2.2, height: 1.2, borderLeftWidth: 0.8, borderBottomWidth: 0.8,
    borderColor: colors.primary, transform: [{ rotate: '-45deg' }],
  },
  line: { flex: 1, height: 1.2, borderRadius: 1, backgroundColor: colors.primary },
  shortLine: { marginRight: 2 },
  loop: {
    position: 'absolute', top: 0, left: 10, width: 8, height: 8,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 4,
    backgroundColor: colors.softRose,
  },
  clip: {
    position: 'absolute', top: 3.5, left: 7, width: 14, height: 6,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 1,
    backgroundColor: colors.softRose, alignItems: 'center', justifyContent: 'center',
  },
  clipLine: { width: 6, height: 1, backgroundColor: colors.primary },
});
