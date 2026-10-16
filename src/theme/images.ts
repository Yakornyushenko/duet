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
  sapphire: {
    birds: require('../../assets/duet-birds-sapphire.png'),
    invitePartner: require('../../assets/invite-partner-sapphire.png'),
    wishesEnvelope: require('../../assets/wishes-envelope-soft-sapphire.png'),
  },
  terracotta: {
    birds: require('../../assets/duet-birds-terracotta.png'),
    invitePartner: require('../../assets/invite-partner-terracotta.png'),
    wishesEnvelope: require('../../assets/wishes-envelope-soft-terracotta.png'),
  },
  graphite: {
    birds: require('../../assets/duet-birds-graphite.png'),
    invitePartner: require('../../assets/invite-partner-graphite.png'),
    wishesEnvelope: require('../../assets/wishes-envelope-soft-graphite.png'),
  },
} satisfies Record<ThemeName, Record<ThemeImageName, ImageSourcePropType>>;

export function useThemeImage(name: ThemeImageName): ImageSourcePropType {
  const { theme } = useTheme();
  return themeImages[theme][name];
}
