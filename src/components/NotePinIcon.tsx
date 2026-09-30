import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function NotePinIcon({ pinned, size = 28 }: { pinned: boolean; size?: number }) {
  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height: size }}>
      <View style={[styles.frame, { left: (size - 28) / 2, top: (size - 28) / 2, transform: [{ scale: size / 28 }] }]}>
        {pinned ? <>
          <View style={styles.paper}>
            {[0, 1, 2].map((line) => <View key={line} style={styles.line} />)}
          </View>
          <Ionicons name="attach-outline" size={21} color={colors.primary} style={styles.attached} />
        </> : <Ionicons name="attach-outline" size={28} color={colors.muted} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  paper: { position: 'absolute', left: 9, top: 8, width: 17, height: 19,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 2, paddingHorizontal: 3, paddingTop: 5, gap: 3 },
  line: { height: 1.2, backgroundColor: colors.primary, borderRadius: 1 },
  attached: { position: 'absolute', top: -2, left: 0, transform: [{ rotate: '-30deg' }] },
});
