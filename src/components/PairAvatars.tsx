import { Image, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { colors, createThemedStyles, typography } from '@/theme/tokens';

type PairAvatarsProps = {
  firstName: string;
  secondName?: string | null;
  firstPhotoUrl?: string | null;
  secondPhotoUrl?: string | null;
  size?: number;
};

function Avatar({ name, photoUrl, size, second = false }: {
  name: string;
  photoUrl?: string | null;
  size: number;
  second?: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [photoUrl]);

  return (
    <View style={[
      styles.avatar,
      second && styles.secondAvatar,
      { width: size, height: size, borderRadius: size / 2 },
    ]}>
      {photoUrl && !photoFailed ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          accessibilityLabel={`Фото профиля ${name}`}
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
}

export function PairAvatars({
  firstName,
  secondName,
  firstPhotoUrl,
  secondPhotoUrl,
  size = 38,
}: PairAvatarsProps) {
  return (
    <View style={styles.row} accessibilityLabel={secondName ? `${firstName} и ${secondName}` : firstName}>
      <Avatar name={firstName} photoUrl={firstPhotoUrl} size={size} />
      {secondName ? (
        <View style={{ marginLeft: -size / 3.8 }}>
          <Avatar name={secondName} photoUrl={secondPhotoUrl} size={size} second />
        </View>
      ) : null}
    </View>
  );
}

const styles = createThemedStyles({
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
    overflow: 'hidden',
  },
  secondAvatar: {
    backgroundColor: colors.secondary,
  },
  initial: {
    ...typography.label,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
