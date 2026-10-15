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
import { colors, spacing } from '@/theme/tokens';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  wide?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, scroll = true, wide = false, contentContainerStyle }: AppScreenProps) {
  const isFocused = useIsFocused();
  const scrollView = useRef<ScrollView>(null);
  const keyboardSpacerHeight = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const { contentMaxWidth, horizontalPadding, wideContentMaxWidth } = useResponsiveLayout();
  const responsiveContentStyle = {
    maxWidth: wide ? wideContentMaxWidth : contentMaxWidth,
    paddingHorizontal: horizontalPadding,
  };

  const scrollFocusedInputIntoView = useCallback((keyboardTop: number) => {
    const input = TextInput.State.currentlyFocusedInput();
    const currentScrollView = scrollView.current;
    const nativeScrollView = currentScrollView?.getNativeScrollRef();
    if (input === null || currentScrollView === null || nativeScrollView == null) return;

    requestAnimationFrame(() => {
      input.measureLayout(
        currentScrollView.getInnerViewNode(),
        (_left, top, _width, height) => {
          nativeScrollView.measureInWindow((_x, scrollTop) => {
            const visibleHeight = Math.max(0, keyboardTop - scrollTop);
            const nextOffset = top + height + spacing.huge - visibleHeight;
            if (nextOffset > scrollOffsetY.current) {
              currentScrollView.scrollTo({ y: nextOffset, animated: true });
            }
          });
        },
        () => undefined,
      );
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
      contentContainerStyle={[styles.content, responsiveContentStyle, contentContainerStyle]}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => { scrollOffsetY.current = event.nativeEvent.contentOffset.y; }}
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

const styles = StyleSheet.create({
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
