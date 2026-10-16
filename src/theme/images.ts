import type { ImageSourcePropType } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { ThemeName } from '@/theme/tokens';

type ThemeImageName = 'birds' | 'invitePartner' | 'wishesEnvelope';

const themeImages = {
  rose: {
    birds: require('../../assets/duet-birds.png'),
    invitePartner: require('../../assets/invite-partner.png'),
    wishesEnvelope: require('../../assets/wishes-envelope-soft.png'),
  },
  emerald: {
    birds: require('../../assets/duet-birds-emerald.png'),
    invitePartner: require('../../assets/invite-partner-emerald.png'),
    wishesEnvelope: require('../../assets/wishes-envelope-soft-emerald.png'),
  },
  honey: {
    birds: require('../../assets/duet-birds-honey.png'),
    invitePartner: require('../../assets/invite-partner-honey.png'),
    wishesEnvelope: require('../../assets/wishes-envelope-soft-honey.png'),
  },
} satisfies Record<ThemeName, Record<ThemeImageName, ImageSourcePropType>>;

export function useThemeImage(name: ThemeImageName): ImageSourcePropType {
  const { theme } = useTheme();
  return themeImages[theme][name];
}
