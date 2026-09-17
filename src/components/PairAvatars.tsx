import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type PairAvatarsProps = {
  firstName: string;
  secondName?: string | null;
  size?: number;
};

export function PairAvatars({ firstName, secondName, size = 38 }: PairAvatarsProps) {
  return (
    <View style={styles.row} accessibilityLabel={secondName ? `${firstName} и ${secondName}` : firstName}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.initial}>{firstName.trim().charAt(0).toUpperCase()}</Text>
      </View>
      {secondName ? (
        <View
          style={[
            styles.avatar,
            styles.secondAvatar,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 3.8 },
          ]}
        >
          <Text style={styles.initial}>{secondName.trim().charAt(0).toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  secondAvatar: {
    backgroundColor: colors.secondary,
  },
  initial: {
    ...typography.label,
    color: colors.white,
    fontWeight: '600',
  },
});
