import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
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

import { colors, spacing } from '@/theme/tokens';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, scroll = true, contentContainerStyle }: AppScreenProps) {
  const scrollView = useRef<ScrollView>(null);
  const keyboardSpacerHeight = useRef(new Animated.Value(0)).current;

  const scrollFocusedInputIntoView = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    if (input === null) return;

    requestAnimationFrame(() => {
      scrollView.current?.scrollResponderScrollNativeHandleToKeyboard(input, spacing.huge, true);
    });
  }, []);

  useEffect(() => {
    if (!scroll || Platform.OS === 'web') return;

    const keyboardShownSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS === 'android') keyboardSpacerHeight.setValue(event.endCoordinates.height);
      scrollFocusedInputIntoView();
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
  }, [keyboardSpacerHeight, scroll, scrollFocusedInputIntoView]);

  const content = scroll ? (
    <ScrollView
      ref={scrollView}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
      {Platform.OS === 'android' ? (
        <Animated.View pointerEvents="none" style={{ height: keyboardSpacerHeight }} />
      ) : null}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentContainerStyle]}>{children}</View>
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
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
});
