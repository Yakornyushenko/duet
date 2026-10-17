import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { useIsFocused } from 'expo-router';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, createThemedStyles, spacing } from '@/theme/tokens';
import { AppBackground } from '@/components/AppBackground';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  wide?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  initialScrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
}>;

export function AppScreen({
  children,
  scroll = true,
  wide = false,
  contentContainerStyle,
  initialScrollOffset,
  onScrollOffsetChange,
}: AppScreenProps) {
  const isFocused = useIsFocused();
  const scrollView = useRef<ScrollView>(null);
  const keyboardSpacerHeight = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(initialScrollOffset ?? 0);
  const { contentMaxWidth, horizontalPadding, wideContentMaxWidth } = useResponsiveLayout();
  const responsiveContentStyle = {
    maxWidth: wide ? wideContentMaxWidth : contentMaxWidth,
    paddingHorizontal: horizontalPadding,
  };

  const scrollFocusedInputIntoView = useCallback((keyboardTop: number) => {
    const input = TextInput.State.currentlyFocusedInput();
    const currentScrollView = scrollView.current;
    if (input === null || currentScrollView === null) return;

    requestAnimationFrame(() => {
      input.measureInWindow((_x, inputTop, _width, height) => {
        const coveredHeight = inputTop + height + spacing.huge - keyboardTop;
        if (coveredHeight > 0) {
          currentScrollView.scrollTo({ y: scrollOffsetY.current + coveredHeight, animated: true });
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!scroll || !isFocused || Platform.OS === 'web') return;

    const keyboardShownSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS === 'android') keyboardSpacerHeight.setValue(event.endCoordinates.height);
      scrollFocusedInputIntoView(event.endCoordinates.screenY);
    });
    const keyboardHiddenSubscription = Keyboard.addListener('keyboardDidHide', (event) => {
      if (Platform.OS !== 'android') return;
      Animated.timing(keyboardSpacerHeight, {
        toValue: 0,
        duration: event.duration || 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    return () => {
      keyboardShownSubscription.remove();
      keyboardHiddenSubscription.remove();
      keyboardSpacerHeight.stopAnimation();
    };
  }, [isFocused, keyboardSpacerHeight, scroll, scrollFocusedInputIntoView]);

  const content = scroll ? (
    <ScrollView
      ref={scrollView}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentOffset={initialScrollOffset === undefined ? undefined : { x: 0, y: initialScrollOffset }}
      contentContainerStyle={[styles.content, responsiveContentStyle, contentContainerStyle]}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => {
        const offset = event.nativeEvent.contentOffset.y;
        scrollOffsetY.current = offset;
        onScrollOffsetChange?.(offset);
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {children}
      {Platform.OS === 'android' ? (
        <Animated.View pointerEvents="none" style={{ height: keyboardSpacerHeight }} />
      ) : null}
    </ScrollView>
  ) : (
    <View style={[styles.content, responsiveContentStyle, styles.fill, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppBackground />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={!scroll && Platform.OS === 'ios'}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
});
