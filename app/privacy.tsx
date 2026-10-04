import { Href, Stack, router } from 'expo-router';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { supportEmail } from '@/config/support';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

const duetLogo = require('../assets/duet-birds.png') as ReturnType<typeof Image.resolveAssetSource>;

const privacySections = [
  {
    title: '1. Оператор и область действия',
    paragraphs: [
      'Настоящая политика конфиденциальности относится к мобильному приложению Duet и его публичным веб-страницам. Duet — закрытое пространство двух партнёров для общих дат, заметок, желаний, фотографий и вопросов дня.',
      'Оператором персональных данных и разработчиком Duet является физическое лицо, применяющее налог на профессиональный доход (самозанятый). Связаться с оператором по вопросам конфиденциальности можно по email, указанному в разделе «Контакты».',
    ],
  },
  {
    title: '2. Какие данные обрабатываются',
    bullets: [
      'данные аккаунта: адрес электронной почты, имя профиля, идентификатор пользователя и данные сессии;',
      'данные пары: состав пары, дата начала отношений, код приглашения и технические сведения об объединении пространств;',
      'созданное содержимое: важные даты и категории, отметки выполнения, заметки и списки, желания, описания, комментарии и выбранные фотографии;',
      'вопросы дня: настройки, подтверждение совершеннолетия для категории вопросов об интимной стороне отношений, выбранное время, часовой пояс, вопросы и ответы пользователей;',
      'уведомления: Expo push-токен и сведения, необходимые поставщикам уведомлений для доставки сообщения;',
      'локальные данные: защищённая сессия, настройки напоминаний и временные черновики заметок;',
      'технические сведения: поставщики инфраструктуры могут обрабатывать IP-адрес, сведения о браузере или устройстве, время и результат запроса, идентификатор установки и журналы ошибок для безопасности и работоспособности сервиса.',
    ],
  },
  {
    title: '3. Пароль, разрешения и чувствительные сведения',
    paragraphs: [
      'Пароль передаётся непосредственно в Supabase Auth по защищённому соединению и обрабатывается сервисом авторизации. Duet и его разработчик не получают пароль в открытом виде.',
      'При добавлении фотографии Duet открывает системный выбор файлов и получает только выбранное пользователем изображение. Приложение не запрашивает доступ к камере, микрофону, контактам, точному или примерному местоположению.',
      'В настройках Duet есть необязательная категория вопросов для пары об интимной стороне отношений. Она доступна только совершеннолетним пользователям после отдельного подтверждения и согласия обоих партнёров. Категорию можно отключить; ещё не раскрытые вопросы из неё будут отменены.',
      'Пользователь сам решает, что написать в свободном поле ответа. Вопросы Duet не требуют сообщать сведения о здоровье, политических или религиозных взглядах, национальности и другие специальные категории персональных данных. Просим не указывать в ответах избыточные персональные данные — свои или третьих лиц.',
    ],
  },
  {
    title: '4. Для чего используются данные',
    bullets: [
      'создание аккаунта, вход, восстановление доступа и защита сессии;',
      'синхронизация закрытого пространства пары между устройствами;',
      'хранение и показ созданных дат, заметок, желаний, фотографий, комментариев и ответов;',
      'доставка локальных напоминаний и push-уведомлений, выбранных пользователем;',
      'ответы на обращения в поддержку, обеспечение безопасности, предотвращение злоупотреблений и устранение ошибок.',
    ],
  },
  {
    title: '5. Кто видит данные и кому они передаются',
    paragraphs: [
      'Содержимое общего пространства доступно пользователю и связанному с ним партнёру. Ответ на вопрос дня до раскрытия доступен только его автору и открывается партнёру после ответа обоих. Не передавайте код приглашения посторонним.',
      'Supabase используется для авторизации, базы данных, серверных функций и хранения фотографий. Expo и Google Firebase Cloud Messaging используются для выдачи push-токена и доставки уведомлений на Android; на iOS в доставке может участвовать Apple Push Notification service. Cloudflare обслуживает публичные веб-страницы Duet.',
      'Эти организации выступают поставщиками услуг и получают только сведения, необходимые для соответствующей функции. Оператор также может раскрыть данные, если этого требует применимый закон или действительный запрос уполномоченного органа.',
      'Оператор технически имеет административный доступ к облачному проекту. Он используется только для поддержки, безопасности, устранения ошибок, исполнения запроса пользователя или требования закона.',
    ],
  },
  {
    title: '6. Продажа данных, реклама и аналитика',
    paragraphs: [
      'Duet не продаёт и не сдаёт персональные данные в аренду, не использует их для сторонней рекламы и не передаёт рекламным сетям. В текущей версии приложения отсутствуют сторонние SDK рекламы, аналитики поведения и автоматического сбора отчётов о сбоях.',
      'Duet не собирает IMEI, IMSI, серийный номер SIM-карты, Android Advertising ID или перечень установленных на устройстве приложений.',
    ],
  },
  {
    title: '7. Хранение и трансграничная обработка',
    paragraphs: [
      'Основные данные хранятся в настроенном для проекта регионе Supabase. Инфраструктура Supabase, Expo, Google, Apple и их поставщиков может находиться за пределами страны пользователя, поэтому при использовании Duet возможна трансграничная обработка данных.',
      'Данные в активной базе и файловом хранилище сохраняются, пока существует аккаунт либо пока они необходимы для соответствующей функции. Отдельные записи пользователь может удалять непосредственно в приложении.',
      'После удаления данных остаточные записи могут сохраняться в автоматических резервных копиях базы Supabase до 7 дней, а в технических журналах Supabase — до 1 дня, после чего удаляются автоматически. Загруженные фотографии не входят в резервные копии базы данных.',
    ],
  },
  {
    title: '8. Как защищаются данные',
    paragraphs: [
      'Передача данных между приложением и облачными сервисами выполняется по HTTPS с использованием современного шифрования. Доступ к данным пары ограничивается авторизацией, политиками доступа базы данных и проверками на сервере.',
      'Фотографии хранятся в закрытом хранилище и выдаются авторизованным участникам пространства по временным ссылкам. Сессия на поддерживаемых мобильных устройствах сохраняется в защищённом хранилище. Доступ администратора к инфраструктуре ограничивается необходимыми рабочими задачами.',
      'Ни один способ хранения не исключает риск полностью. При обнаружении инцидента оператор принимает разумные меры для ограничения последствий и выполняет обязанности по уведомлению, предусмотренные применимым законодательством.',
    ],
  },
  {
    title: '9. Удаление аккаунта и данных',
    paragraphs: [
      'Удалить аккаунт можно в приложении: «Ещё → Профиль → Удалить аккаунт и данные». Внешняя инструкция и способ направить запрос доступны по адресу https://duet-app.pages.dev/delete-account.',
      'После завершения удаления удаляются аккаунт авторизации, профиль, участие в паре, push-токены, ответы, созданные даты, желания, комментарии и загруженные пользователем фотографии. Серверные сессии аккаунта прекращаются. При удалении внутри приложения локальная сессия, черновики и настройки очищаются на текущем устройстве.',
      'Если пространство использовалось вместе с партнёром, данные партнёра не удаляются. Совместные элементы без однозначно определённого автора могут оставаться у партнёра до удаления соответствующего материала или аккаунта партнёра, но связь с удалённым аккаунтом удаляется. Если партнёра нет, личное пространство удаляется целиком.',
      'Запрос через поддержку выполняется не позднее 30 календарных дней после подтверждения владения аккаунтом. Переписка по запросу хранится ещё 30 дней после его выполнения, затем удаляется. Локальные черновики на других устройствах не могут быть удалены удалённо; их можно удалить, очистив данные приложения или удалив приложение с соответствующего устройства.',
      'Остаточные записи в резервных копиях базы и технических журналах удаляются в сроки, указанные в разделе 7. Если применимый закон требует сохранить отдельные сведения для безопасности, предотвращения мошенничества или исполнения юридической обязанности, они хранятся только в течение установленного законом срока; оператор сообщит об этом пользователю.',
    ],
  },
  {
    title: '10. Платежи',
    paragraphs: [
      'Текущая версия Duet не принимает платежи и не собирает номера банковских карт, банковских счетов или историю покупок.',
    ],
  },
  {
    title: '11. Ваши права и выбор',
    bullets: [
      'получить сведения об обработке своих данных и запросить доступ к ним;',
      'исправлять имя и созданное содержимое или удалять отдельные записи;',
      'отозвать разрешения устройства и отключить уведомления или категорию вопросов об интимной стороне отношений;',
      'если вход в приложение недоступен, запросить через email поддержки удаление аккаунта и связанных с ним данных;',
      'отозвать согласие путём отключения необязательной функции или удаления аккаунта;',
      'обратиться в уполномоченный орган по защите персональных данных своей страны.',
    ],
  },
  {
    title: '12. Возрастные ограничения и изменения политики',
    paragraphs: [
      'Duet предназначен для пользователей старше 18 лет. Если вы считаете, что несовершеннолетний передал Duet персональные данные, сообщите об этом оператору — сведения будут проверены и удалены при наличии оснований.',
      'Политика может обновляться при изменении функций, поставщиков или требований законодательства. Новая редакция публикуется на этой странице с новой датой. О существенных изменениях пользователям может быть сообщено внутри приложения.',
    ],
  },
] as const;

export default function PrivacyScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Политика конфиденциальности Duet' }} />

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
        <Text style={styles.title}>Политика конфиденциальности</Text>
        <Text style={styles.updatedAt}>Обновлено 4 октября 2026 года</Text>
      </View>

      <View style={styles.introCard}>
        <View style={styles.introAccent} />
        <Text style={styles.introLabel}>Коротко</Text>
        <Text style={styles.intro}>
          Эта политика объясняет, какие данные Duet получает, как использует и защищает их, кому передаёт и как вы можете удалить свои данные.
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
        <View style={styles.deletionLinkCopy}>
          <Text style={styles.deletionLinkLabel}>Управление данными</Text>
          <Text style={styles.deletionLinkText}>Удаление аккаунта и данных</Text>
        </View>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>

      <View style={styles.contactCard}>
        <Text style={styles.sectionTitle}>13. Контакты</Text>
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
            <Text selectable style={styles.email}>Написать: {supportEmail}</Text>
            <Text style={styles.emailArrow}>→</Text>
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
    maxWidth: 720,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  backButtonText: {
    ...typography.label,
    color: colors.primary,
  },
  logo: {
    width: 148,
    height: 96,
    marginBottom: -spacing.md,
  },
  brand: {
    ...typography.cardTitle,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  updatedAt: {
    ...typography.caption,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  introCard: {
    position: 'relative',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.softRose,
    overflow: 'hidden',
  },
  introAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
    backgroundColor: colors.primary,
  },
  introLabel: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  intro: {
    ...typography.body,
    color: colors.secondary,
  },
  section: {
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  deletionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  deletionLinkCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  deletionLinkLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  deletionLinkText: {
    ...typography.cardTitle,
    color: colors.danger,
  },
  linkArrow: {
    fontSize: 26,
    lineHeight: 30,
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
  },
  emailArrow: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.primary,
  },
  missingContact: {
    ...typography.caption,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.68,
  },
});
