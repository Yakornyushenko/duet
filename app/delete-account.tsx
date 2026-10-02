import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, Stack, router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { supportEmail } from '@/config/support';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function DeleteAccountScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Удаление аккаунта Duet' }} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/auth')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Удаление аккаунта</Text>
          <Text style={styles.subtitle}>Аккаунт Duet и связанные с ним данные</Text>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="warning-outline" size={28} color={colors.danger} />
        <Text style={styles.noticeTitle}>Удаление нельзя отменить</Text>
        <Text style={styles.body}>
          После удаления вы потеряете доступ к аккаунту. Повторный вход и восстановление удалённых данных будут невозможны.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Удалить аккаунт в приложении</Text>
        <Text style={styles.body}>Самый быстрый способ:</Text>
        <View style={styles.stepsCard}>
          <Text style={styles.step}>1. Откройте «Ещё».</Text>
          <Text style={styles.step}>2. Перейдите в «Профиль».</Text>
          <Text style={styles.step}>3. Нажмите «Удалить аккаунт и данные».</Text>
          <Text style={styles.step}>4. Подтвердите удаление.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Запросить удаление без доступа к приложению</Text>
        <Text style={styles.body}>
          Напишите с адреса, который использовался для регистрации. В теме письма укажите «Удаление аккаунта Duet». Мы можем запросить подтверждение владения аккаунтом, но пароль сообщать не нужно.
        </Text>
        {supportEmail ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Запросить удаление через ${supportEmail}`}
            onPress={() => void Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent('Удаление аккаунта Duet')}`)}
            style={({ pressed }) => [styles.emailButton, pressed && styles.pressed]}
          >
            <Ionicons name="mail-outline" size={20} color={colors.white} />
            <Text style={styles.emailButtonText}>Написать {supportEmail}</Text>
          </Pressable>
        ) : (
          <Text style={styles.missingContact}>Email поддержки будет указан до публикации приложения.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Какие данные удаляются</Text>
        {[
          'аккаунт, email, имя профиля и активные сессии;',
          'push-токены, настройки вопросов и ваши ответы;',
          'созданные вами даты, желания, комментарии и загруженные фотографии;',
          'локальные черновики и настройки напоминаний на текущем устройстве;',
          'личное пространство и всё его содержимое, если к нему не присоединён партнёр.',
        ].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.body}>
          Если пространство уже общее, совместные материалы без однозначного автора могут остаться у партнёра без связи с удалённым аккаунтом. Удалите такие материалы заранее или перечислите их в обращении.
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Открыть политику конфиденциальности"
        onPress={() => router.push('/privacy' as Href)}
        style={({ pressed }) => [styles.privacyLink, pressed && styles.pressed]}
      >
        <Text style={styles.privacyLinkText}>Политика конфиденциальности Duet</Text>
        <Ionicons name="open-outline" size={18} color={colors.primary} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  backButton: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.softRose,
  },
  title: { ...typography.sectionTitle, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted },
  noticeCard: { gap: spacing.md, padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.softRose },
  noticeTitle: { ...typography.cardTitle, color: colors.danger },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.cardTitle, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  stepsCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  step: { ...typography.body, color: colors.text },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { ...typography.body, color: colors.primary },
  bulletText: { ...typography.body, flex: 1, color: colors.muted },
  emailButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: colors.primary,
  },
  emailButtonText: { ...typography.label, color: colors.white },
  missingContact: { ...typography.caption, color: colors.danger },
  privacyLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    minHeight: 44,
  },
  privacyLinkText: { ...typography.label, color: colors.primary, textDecorationLine: 'underline' },
  pressed: { opacity: 0.68 },
});
