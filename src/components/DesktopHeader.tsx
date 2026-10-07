import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type DesktopSection = 'home' | 'dates' | 'more';

const navigation: { label: string; section: DesktopSection; href: '/(tabs)' | '/(tabs)/dates' | '/(tabs)/more' }[] = [
  { label: 'Главная', section: 'home', href: '/(tabs)' },
  { label: 'Даты', section: 'dates', href: '/(tabs)/dates' },
  { label: 'Ещё', section: 'more', href: '/(tabs)/more' },
];

function getActiveSection(pathname: string): DesktopSection {
  if (pathname === '/') return 'home';
  if (pathname === '/dates' || pathname === '/date-form' || pathname === '/event-reminders') return 'dates';
  return 'more';
}

export function DesktopHeader() {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);
  const { horizontalPadding, wideContentMaxWidth } = useResponsiveLayout();

  return (
    <View style={styles.header}>
      <View style={[styles.content, { maxWidth: wideContentMaxWidth, paddingHorizontal: horizontalPadding }]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Duet — на главную"
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
        >
          <Text style={styles.brandMark}>D</Text>
          <Text style={styles.brandText}>Duet</Text>
        </Pressable>

        <View accessibilityRole="tablist" style={styles.navigation}>
          {navigation.map((item) => {
            const selected = activeSection === item.section;
            return (
              <Pressable
                key={item.section}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => router.replace(item.href)}
                style={({ pressed }) => [styles.item, selected && styles.selectedItem, pressed && styles.pressed]}
              >
                <Text style={[styles.itemText, selected && styles.selectedItemText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: {
    width: '100%',
    minHeight: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 18,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  brandText: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: colors.softRose,
  },
  item: {
    minHeight: 42,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  selectedItem: {
    backgroundColor: colors.surface,
  },
  itemText: {
    ...typography.label,
    color: colors.muted,
  },
  selectedItemText: {
    color: colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
});
