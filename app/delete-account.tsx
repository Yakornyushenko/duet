import { Href, Stack, router } from 'expo-router';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { supportEmail } from '@/config/support';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

const duetLogo = require('../assets/duet-birds.png') as ReturnType<typeof Image.resolveAssetSource>;

const deletionSteps = [
  'Откройте раздел «Ещё».',
  'Перейдите в «Профиль».',
  'Нажмите «Удалить аккаунт и данные».',
  'Подтвердите окончательное удаление.',
] as const;

const deletedData = [
  'аккаунт, email, имя профиля и активные сессии;',
  'push-токены, настройки вопросов и ваши ответы;',
  'созданные вами даты, желания, комментарии и загруженные фотографии;',
  'локальная сессия, черновики и настройки напоминаний на текущем устройстве — при удалении внутри приложения;',
  'личное пространство и всё его содержимое, если к нему не присоединён партнёр.',
] as const;

const retainedData = [
  'Запрос через поддержку выполняется не позднее 30 календарных дней после подтверждения владения аккаунтом. Переписка по запросу хранится ещё 30 дней после его выполнения, затем удаляется.',
  'После завершения удаления данные исчезают из активной базы и файлового хранилища. Остаточные записи могут сохраняться в резервных копиях базы Supabase до 7 дней, а в технических журналах Supabase — до 1 дня. Загруженные фотографии в резервные копии базы не входят.',
  'Совместные материалы без однозначно определённого автора могут оставаться у партнёра до удаления соответствующего материала или аккаунта партнёра. Связь с удалённым аккаунтом удаляется.',
  'Локальные черновики и настройки на других устройствах остаются до очистки данных приложения или удаления приложения с соответствующего устройства.',
] as const;

const deletionEmailBody = [
  'Здравствуйте!',
  '',
  'Прошу удалить мой аккаунт Duet и связанные с ним данные.',
  'Email аккаунта: ',
].join('\n');

export default function DeleteAccountScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Удаление аккаунта Duet' }} />

      {Platform.OS !== 'web' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/auth')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backButtonText}>← Назад</Text>
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <Image source={duetLogo} resizeMode="contain" style={styles.logo} accessible={false} />
        <Text style={styles.brand}>Duet</Text>
        <Text style={styles.title}>Удаление аккаунта и данных</Text>
        <Text style={styles.subtitle}>Выберите удобный способ отправить запрос</Text>
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeAccent} />
        <Text style={styles.noticeLabel}>Важно</Text>
        <Text style={styles.noticeTitle}>Удаление нельзя отменить</Text>
        <Text style={styles.body}>
          После удаления вы потеряете доступ к аккаунту. Повторный вход и восстановление удалённых данных будут невозможны.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Удалить аккаунт в приложении</Text>
        <Text style={styles.body}>Это самый быстрый способ, если вы можете войти в Duet.</Text>
        {deletionSteps.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.step}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Запросить удаление без доступа к приложению</Text>
        <Text style={styles.body}>
          Напишите с адреса, который использовался для регистрации. В теме письма укажите «Удаление аккаунта Duet». Мы можем запросить подтверждение владения аккаунтом, но пароль сообщать не нужно.
        </Text>
        <Text style={styles.body}>
          После подтверждения владения аккаунтом запрос будет выполнен не позднее 30 календарных дней. Когда удаление завершится, мы ответим на ваше письмо.
        </Text>
        <Text style={styles.securityNote}>
          Никому не отправляйте пароль или код подтверждения входа.
        </Text>
        {supportEmail ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Запросить удаление через ${supportEmail}`}
            onPress={() => void Linking.openURL(
              `mailto:${supportEmail}?subject=${encodeURIComponent('Удаление аккаунта Duet')}&body=${encodeURIComponent(deletionEmailBody)}`,
            )}
            style={({ pressed }) => [styles.emailButton, pressed && styles.pressed]}
          >
            <View style={styles.emailButtonCopy}>
              <Text style={styles.emailButtonText}>Написать в поддержку</Text>
              <Text style={styles.emailButtonAddress}>{supportEmail}</Text>
            </View>
            <Text style={styles.emailButtonArrow}>→</Text>
          </Pressable>
        ) : (
          <Text style={styles.missingContact}>Email поддержки будет указан до публикации приложения.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Какие данные удаляются</Text>
        {deletedData.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.retentionTitle}>Какие данные могут сохраниться и как долго</Text>
        {retainedData.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.body}>
          Чтобы совместный материал не остался у партнёра, удалите его в приложении до удаления аккаунта.
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Открыть политику конфиденциальности"
        onPress={() => router.push('/privacy' as Href)}
        style={({ pressed }) => [styles.privacyLink, pressed && styles.pressed]}
      >
        <View style={styles.privacyLinkCopy}>
          <Text style={styles.privacyLinkLabel}>Подробнее об обработке данных</Text>
          <Text style={styles.privacyLinkText}>Политика конфиденциальности Duet</Text>
        </View>
        <Text style={styles.privacyLinkArrow}>→</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 720, gap: spacing.xl },
  header: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md },
  backButton: {
    alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm,
  },
  backButtonText: { ...typography.label, color: colors.primary },
  logo: { width: 148, height: 96, marginBottom: -spacing.md },
  brand: { ...typography.cardTitle, color: colors.primary, marginBottom: spacing.sm },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.caption, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
  noticeCard: {
    position: 'relative', gap: spacing.sm, padding: spacing.xl, borderRadius: radii.lg,
    backgroundColor: colors.softRose, overflow: 'hidden',
  },
  noticeAccent: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 5, backgroundColor: colors.danger,
  },
  noticeLabel: { ...typography.label, color: colors.danger, fontWeight: '700' },
  noticeTitle: { ...typography.cardTitle, color: colors.danger },
  section: {
    gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, backgroundColor: colors.surface,
  },
  sectionTitle: { ...typography.cardTitle, color: colors.text },
  retentionTitle: {
    ...typography.label, color: colors.text, fontWeight: '700', marginTop: spacing.sm,
  },
  body: { ...typography.body, color: colors.muted },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.round, backgroundColor: colors.softRose,
  },
  stepNumberText: { ...typography.label, color: colors.primary, fontWeight: '700' },
  step: { ...typography.body, flex: 1, color: colors.text },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { ...typography.body, color: colors.primary },
  bulletText: { ...typography.body, flex: 1, color: colors.muted },
  securityNote: {
    ...typography.label, color: colors.danger, padding: spacing.md,
    borderRadius: radii.md, backgroundColor: colors.softRose,
  },
  emailButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.md, backgroundColor: colors.primary,
  },
  emailButtonCopy: { flex: 1, gap: spacing.xs },
  emailButtonText: { ...typography.label, color: colors.white, fontWeight: '700' },
  emailButtonAddress: { ...typography.caption, color: colors.white, opacity: 0.88 },
  emailButtonArrow: { fontSize: 24, lineHeight: 28, color: colors.white },
  missingContact: { ...typography.caption, color: colors.danger },
  privacyLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderWidth: 1,
    borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadow,
  },
  privacyLinkCopy: { flex: 1, gap: spacing.xs },
  privacyLinkLabel: { ...typography.caption, color: colors.muted },
  privacyLinkText: { ...typography.cardTitle, color: colors.primary },
  privacyLinkArrow: { fontSize: 26, lineHeight: 30, color: colors.primary },
  pressed: { opacity: 0.68 },
});
