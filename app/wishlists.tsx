import { AppIcon } from '@/components/AppIcon';
import { Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { AppButton } from '@/components/AppButton';
import { BackButton } from '@/components/BackButton';
import { entityIcons } from '@/utils/entityIcons';
import { useApp } from '@/context/AppContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { supabase } from '@/lib/supabase';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '@/services/notificationApi';
import { listWishes, Wish } from '@/services/wishes';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { canManageWishlist, Wishlist, getWishlists } from '@/utils/wishlists';

export default function WishlistsScreen() {
  const params = useLocalSearchParams<{ list?: string }>();
  const { user, couple } = useApp();
  const wishlists = getWishlists(user, couple);
  const { horizontalPadding, isDesktop } = useResponsiveLayout();
  const [list, setList] = useState<Wishlist>(
    wishlists.find((item) => item.value === params.list)?.value ?? 'together',
  );
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const loadedFor = useRef<string | null>(null);
  const scope = `${user?.id ?? ''}:${couple?.id ?? ''}`;

  useFocusEffect(useCallback(() => {
    const client = supabase;
    if (!couple || !client) {
      loadedFor.current = null;
      setWishes([]);
      setLoading(false);
      setError(true);
      return;
    }
    let active = true;
    let request = 0;
    let controller: AbortController | undefined;

    // Ask for permission so the partner gets notified about wish changes.
    // Device token registration itself happens centrally in ReminderProvider.
    const ensurePushPermission = async () => {
      if (Platform.OS === 'web') {
        return;
      }
      const permission = await getNotificationPermission();
      if (!permission.granted && permission.canAskAgain) {
        await requestNotificationPermission();
      }
    };

    const load = async () => {
      const current = ++request;
      controller?.abort();
      controller = new AbortController();
      try {
        const result = await listWishes(couple.id, controller.signal);
        if (!active || current !== request) {
          return;
        }
        setWishes(result);
        loadedFor.current = scope;
        setError(false);
      } catch {
        if (active && current === request) {
          setError(true);
        }
      } finally {
        if (active && current === request) {
          setLoading(false);
        }
      }
    };

    // Keep the current pair's cards visible while refreshing on focus.
    if (loadedFor.current !== scope) {
      setWishes([]);
      setLoading(true);
    }
    void load();
    void ensurePushPermission().catch((permissionError) => {
      console.warn('Не удалось запросить разрешение на уведомления', permissionError);
    });

    const channel = client
      .channel(`wishes:${couple.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishes', filter: `couple_id=eq.${couple.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      controller?.abort();
      void client.removeChannel(channel);
    };
  }, [couple?.id, revision, scope]));

  const visible = useMemo(() => wishes
    .filter((wish) => wish.list === list)
    .sort((a, b) => Number(a.fulfilled) - Number(b.fulfilled)), [wishes, list]);
  const canManageCurrentList = canManageWishlist(user, couple, list);

  const renderWish = useCallback(({ item: wish }: { item: Wish }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={wish.title}
      accessibilityHint="Открыть желание"
      onPress={() => router.push(`/wish?id=${wish.id}` as Href)}
      style={({ pressed }) => [styles.card, styles.wishCard, isDesktop && styles.desktopWishCard, pressed && styles.pressed]}
    >
      <View style={styles.wishRow}>
        <AppIcon name={entityIcons[wish.icon] ?? entityIcons.sparkles} size={22} color={colors.primary} />
        {wish.fulfilled && <AppIcon name="checkmark-circle" size={16} color={colors.primary} />}
        <Text style={[styles.wishTitle, wish.fulfilled && styles.done]} numberOfLines={2}>
          {wish.title}
        </Text>
        <AppIcon name="chevron-forward" size={20} color={colors.muted} />
      </View>
    </Pressable>
  ), [isDesktop]);

  return (
    <AppScreen scroll={false} wide contentContainerStyle={styles.screen}>
      <FlatList
        key={isDesktop ? 'desktop' : 'compact'}
        data={!loading && loadedFor.current === scope ? visible : []}
        keyExtractor={(wish) => wish.id}
        renderItem={renderWish}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        numColumns={isDesktop ? 2 : 1}
        columnWrapperStyle={isDesktop ? styles.desktopColumns : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        ListHeaderComponent={<>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.heading}>{couple?.partnerName ? 'Наши желания' : 'Желания'}</Text>
        {canManageCurrentList ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить желание"
          onPress={() => router.push(`/wish-edit?list=${list}` as Href)}
          style={styles.icon}
        >
          <AppIcon name="add" size={26} color={colors.primary} />
        </Pressable> : null}
      </View>
      <Text style={styles.subtitle}>Маленькие радости и большие мечты</Text>
      <View style={styles.tabs}>
        {wishlists.map((item) => {
          const selected = list === item.value;
          const readOnly = !canManageWishlist(user, couple, item.value);
          const foreground = selected ? colors.white : readOnly ? colors.secondary : colors.primary;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="tab"
              accessibilityHint={readOnly ? 'Можно просматривать и комментировать' : undefined}
              accessibilityState={{ selected }}
              onPress={() => setList(item.value)}
              style={[styles.tab, selected && styles.selected, readOnly && styles.readOnlyTab,
                selected && readOnly && styles.selectedReadOnlyTab]}
            >
              <AppIcon name={item.icon} size={21} color={foreground} />
              <Text style={{ color: selected ? colors.white : colors.secondary }} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && (
        <View style={styles.card}>
          <Text style={styles.body}>Не удалось загрузить желания. Попробуйте ещё раз.</Text>
          <AppButton label="Повторить" onPress={() => setRevision((current) => current + 1)} />
        </View>
      )}
      {loading ? (
        <Text style={styles.subtitle}>Загружаем желания…</Text>
      ) : (
        <>
          {!error && !visible.length ? (
            <Text style={styles.empty}>{canManageCurrentList
              ? 'Здесь найдётся место каждой мечте. Добавьте первое желание ♥'
              : 'Партнёр пока не добавил сюда желания.'}</Text>
          ) : null}

        </>
      )}
        </>}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  listContent: { paddingTop: spacing.lg, paddingBottom: spacing.huge },
  desktopColumns: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
  },
  heading: { ...typography.sectionTitle, color: colors.text, flex: 1 },
  subtitle: { ...typography.body, color: colors.muted, marginVertical: spacing.lg },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  tab: {
    flex: 1,
    minHeight: 68,
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
  },
  selected: { backgroundColor: colors.primary },
  readOnlyTab: { backgroundColor: colors.soft },
  selectedReadOnlyTab: { backgroundColor: colors.secondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  wishCard: { gap: 0 },
  desktopWishCard: { flex: 1 },
  wishRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wishTitle: { ...typography.cardTitle, color: colors.text, flex: 1 },
  body: { ...typography.body, color: colors.text },
  empty: {
    ...typography.body,
    textAlign: 'center',
    color: colors.muted,
    paddingVertical: spacing.xxl,
  },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  pressed: { opacity: 0.84 },
});
