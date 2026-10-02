import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, Stack, router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { supportEmail } from '@/config/support';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const privacySections = [
  {
    title: '1. Какие данные обрабатывает Duet',
    paragraphs: [
      'Для регистрации и входа мы обрабатываем адрес электронной почты, имя профиля, технический идентификатор аккаунта и данные сессии. Пароль обрабатывается сервисом авторизации Supabase и не доступен приложению в открытом виде.',
      'Когда вы пользуетесь Duet, могут сохраняться дата начала отношений, состав пары, важные даты и категории, заметки и списки, желания, комментарии, выбранные фотографии, настройки вопросов дня и ваши ответы.',
      'Для напоминаний и push-уведомлений могут обрабатываться push-токен устройства, настройки уведомлений, часовой пояс и выбранное время. Доступ к галерее запрашивается только при добавлении фотографии; приложение получает только выбранное вами изображение.',
    ],
  },
  {
    title: '2. Для чего используются данные',
    bullets: [
      'создание аккаунта, вход и защита сессии;',
      'синхронизация общего пространства пары между устройствами;',
      'хранение и показ созданных вами дат, заметок, желаний, фотографий и ответов;',
      'отправка выбранных вами напоминаний и уведомлений;',
      'обеспечение безопасности, предотвращение злоупотреблений и исправление ошибок.',
    ],
  },
  {
    title: '3. Кто видит данные',
    paragraphs: [
      'Данные общего пространства доступны вам и связанному с вашим аккаунтом партнёру. Не передавайте код приглашения посторонним: по нему другой пользователь может присоединиться к пространству пары.',
      'Для работы приложения используются Supabase — для авторизации, базы данных и хранения фотографий — и сервисы Expo/Firebase для доставки push-уведомлений. Эти поставщики обрабатывают только данные, необходимые для оказания своих услуг.',
      'Мы не продаём персональные данные, не используем их для сторонней рекламы и на текущий момент не подключаем сторонние рекламные или аналитические SDK.',
    ],
  },
  {
    title: '4. Хранение и защита',
    paragraphs: [
      'Данные хранятся в облачной инфраструктуре используемых поставщиков и могут обрабатываться за пределами страны вашего проживания. Передача выполняется по защищённому соединению. Доступ к данным пары ограничивается правилами авторизации и политиками доступа базы данных.',
      'Данные сохраняются, пока нужен ваш аккаунт и работа соответствующих функций. После удаления аккаунта связанные данные удаляются либо обезличиваются, кроме сведений, которые необходимо временно сохранить для безопасности, предотвращения мошенничества или выполнения требований закона. Резервные копии могут очищаться с технической задержкой.',
    ],
  },
  {
    title: '5. Ваш выбор и права',
    bullets: [
      'изменять имя и содержимое общего пространства в приложении;',
      'удалять созданные даты, заметки, желания, комментарии и фотографии;',
      'отозвать разрешения на уведомления и доступ к фотографиям в настройках устройства;',
      'запросить доступ, исправление или удаление своих персональных данных через email поддержки.',
    ],
  },
  {
    title: '6. Возрастные ограничения',
    paragraphs: [
      'Duet предназначен для совершеннолетних пользователей. Мы сознательно не собираем данные детей. Если вы считаете, что ребёнок передал нам персональные данные, сообщите об этом по адресу поддержки.',
    ],
  },
  {
    title: '7. Изменения политики',
    paragraphs: [
      'Мы можем обновлять эту политику при изменении функций приложения или требований законодательства. Актуальная версия всегда публикуется на этой странице, а дата обновления указывается в её начале.',
    ],
  },
] as const;

export default function PrivacyScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Политика конфиденциальности Duet' }} />

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
          <Text style={styles.title}>Конфиденциальность</Text>
          <Text style={styles.updatedAt}>Обновлено 2 октября 2026 года</Text>
        </View>
      </View>

      <View style={styles.introCard}>
        <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
        <Text style={styles.intro}>
          Эта политика объясняет, какие данные обрабатывает Duet, зачем они нужны и как вы можете ими управлять.
        </Text>
      </View>

      {privacySections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {'paragraphs' in section
            ? section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)
            : section.bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
        </View>
      ))}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Открыть страницу удаления аккаунта"
        onPress={() => router.push('/delete-account' as Href)}
        style={({ pressed }) => [styles.deletionLink, pressed && styles.pressed]}
      >
        <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
        <Text style={styles.deletionLinkText}>Удаление аккаунта и данных</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <View style={styles.contactCard}>
        <Text style={styles.sectionTitle}>8. Контакты</Text>
        <Text style={styles.body}>
          По вопросам конфиденциальности, обработки или удаления данных напишите разработчику Duet.
        </Text>
        {supportEmail ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Написать на ${supportEmail}`}
            onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}
            style={({ pressed }) => [styles.emailButton, pressed && styles.pressed]}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text selectable style={styles.email}>{supportEmail}</Text>
          </Pressable>
        ) : (
          <Text style={styles.missingContact}>
            Email поддержки будет указан до публикации приложения.
          </Text>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  updatedAt: {
    ...typography.caption,
    color: colors.muted,
  },
  introCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.softRose,
  },
  intro: {
    ...typography.body,
    color: colors.secondary,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.muted,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    ...typography.body,
    color: colors.primary,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
    color: colors.muted,
  },
  contactCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  deletionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  deletionLinkText: {
    ...typography.label,
    flex: 1,
    color: colors.danger,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: 44,
  },
  email: {
    ...typography.body,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  missingContact: {
    ...typography.caption,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.68,
  },
});
