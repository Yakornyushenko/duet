import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

function MoreTabButton(props: BottomTabBarButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [returning, setReturning] = useState(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = props['aria-selected'];

  useEffect(() => {
    setReturning(false);
    setHovered(false);
    return () => {
      if (returnTimer.current !== null) {
        clearTimeout(returnTimer.current);
        returnTimer.current = null;
      }
    };
  }, [selected]);
  if (!props['aria-selected']) {
    return <PlatformPressable {...props} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Назад"
      onPress={(event) => {
        if (returnTimer.current !== null) return;
        event.persist();
        setReturning(true);
        returnTimer.current = setTimeout(() => {
          returnTimer.current = null;
          setReturning(false);
          props.onPress?.(event);
        }, 200);
      }}
      onLongPress={props.onLongPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[props.style, styles.backButton]}
    >
      {({ pressed }) => (
        <View style={[
          styles.backIcon,
          pressed && styles.pressed,
        ]}>
          <Ionicons name="arrow-back" color={pressed || hovered || returning ? colors.primary : colors.muted} size={26} />
        </View>
      )}
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dates"
        options={{
          title: 'Даты',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            const state = navigation.getState();
            if (state.routes[state.index].key !== route.key) return;
            event.preventDefault();
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('index');
          },
        })}
        options={{
          title: 'Ещё',
          tabBarButton: (props) => <MoreTabButton {...props} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: 'center', justifyContent: 'center' },
  backIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
});
