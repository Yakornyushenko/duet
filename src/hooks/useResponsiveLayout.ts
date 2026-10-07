import { Platform, useWindowDimensions } from 'react-native';

import { spacing } from '@/theme/tokens';

const PHONE_CONTENT_MAX_WIDTH = 480;
const TABLET_CONTENT_MAX_WIDTH = 720;
const LARGE_TABLET_CONTENT_MAX_WIDTH = 900;
const DESKTOP_CONTENT_MAX_WIDTH = 1180;
const TABLET_BREAKPOINT = 600;
const LARGE_TABLET_BREAKPOINT = 720;
const DESKTOP_BREAKPOINT = 720;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const isLargeTablet = width >= LARGE_TABLET_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT;
  const contentMaxWidth = isLargeTablet
    ? LARGE_TABLET_CONTENT_MAX_WIDTH
    : isTablet
      ? TABLET_CONTENT_MAX_WIDTH
      : PHONE_CONTENT_MAX_WIDTH;

  return {
    isTablet,
    isDesktop,
    contentMaxWidth,
    wideContentMaxWidth: isDesktop ? DESKTOP_CONTENT_MAX_WIDTH : contentMaxWidth,
    horizontalPadding: isLargeTablet ? spacing.huge : isTablet ? spacing.xxxl : spacing.xl,
    tabBarMaxWidth: isDesktop
      ? LARGE_TABLET_CONTENT_MAX_WIDTH
      : isTablet
        ? TABLET_CONTENT_MAX_WIDTH
        : PHONE_CONTENT_MAX_WIDTH,
    modalMaxWidth: isLargeTablet ? 600 : isTablet ? 520 : 420,
    largeModalMaxWidth: isLargeTablet ? 720 : isTablet ? 600 : 480,
    mediaThumbnailSize: isDesktop ? 160 : isTablet ? 128 : 96,
  };
}
