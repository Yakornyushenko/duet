# Выпуск «Дуэт» в RuStore

Актуально на 14 октября 2026 года.

## Текущий статус

- Package name: `app.duet.mobile`.
- Отображаемое название: `Дуэт`.
- Версия приложения: `1.0.0`, удалённый Android `versionCode`: `7`.
- Expo SDK 57, Android target API 36.
- Типизация и все 11 наборов автоматических тестов проходят.
- Иконка и восемь скриншотов соответствуют базовым лимитам RuStore.
- Карточка подготовлена в `RUSTORE_LISTING_RU.md`.
- Данные и разрешения описаны в `RUSTORE_DATA_SAFETY.md`.
- Профиль EAS `rustore` добавлен для сборки подписанного AAB с названием `Дуэт`; Google Play-профиль `production` сохраняет название `Duet`. Схема вариантов описана в `STORE_VARIANTS.md`.
- Вход в EAS выполнен; постоянный Android JKS и FCM V1 настроены.
- SHA-256 сертификата EAS: `36:31:72:EE:1A:BC:B6:76:B7:50:3D:75:5E:07:B3:DE:C8:A3:86:AD:99:36:74:1D:95:E4:85:77:3B:DA:D4:37`.
- В production-окружении EAS найдены `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` и `EXPO_PUBLIC_SUPPORT_EMAIL`. `google-services.json` хранится в проекте и используется как настроенный fallback.

Найденные локальные файлы `android/app/build/outputs/bundle/release/app-release.aab` и `android/app/build/outputs/apk/release/app-release.apk` подписаны стандартным Android Debug certificate. Их нельзя загружать в RuStore.

## Формат выпуска

Для первого выпуска выбран AAB. RuStore сформирует из него оптимизированные APK для устройств пользователей. Перед загрузкой AAB необходимо отдельно передать RuStore зашифрованный ключ подписи приложения и сертификат ключа загрузки.

Профиль `rustore` использует тот же EAS keystore, что и Android-сборки для других магазинов. Если приложение уже опубликовано в Google Play с Google Play App Signing, сначала нужно сверить сертификаты: несовпадающие подписи не позволят пользователю обновлять приложение между магазинами.

## Блокеры до сборки

1. Сохранить резервную копию release keystore и паролей в защищённом хранилище.
2. Проверить доступность `https://duet.by/privacy` и `https://duet.by/delete-account` из внешней сети.
3. Завершить юридическую проверку вопросов из `RUSTORE_DATA_SAFETY.md`.
4. Подготовить два тестовых аккаунта в одной паре для модератора. Не хранить их пароли в Git.

## 1. Зарегистрировать аккаунт разработчика

Открыть `https://console.rustore.ru/` и войти через VK ID.

- Для физического лица регистрация бесплатна и, согласно справке RuStore, выполняется без модерации заявки.
- Для юридического лица или ИП регистрационная форма подписывается квалифицированной электронной подписью.
- Добавить приложение может только пользователь с ролью владельца компании.

## 2. Проверить EAS и собрать подписанный AAB

Проверить авторизацию и список production-переменных без вывода их значений:

```powershell
pnpm dlx eas-cli@latest whoami
pnpm dlx eas-cli@latest env:list --environment production
pnpm dlx eas-cli@latest credentials --platform android
```

После проверки подписи выполнить:

```powershell
pnpm run typecheck
node --test tests/*.cjs
pnpm exec expo install --check
pnpm dlx eas-cli@latest build --platform android --profile rustore
```

Перед загрузкой проверить подпись итогового AAB:

```powershell
jarsigner -verify -verbose -certs path\to\duet-rustore.aab
```

В сертификате не должно быть `CN=Android Debug`.

## 3. Передать RuStore подпись AAB

1. В карточке приложения открыть загрузку версии и скачать предоставленный RuStore файл `pepk.jar`.
2. В менеджере EAS Credentials скачать резервную копию Android keystore и сохранить её вне репозитория.
3. Скопировать из RuStore Консоли команду PEPK с уникальным `encryptionkey` и создать зашифрованный архив подписи.
4. Экспортировать сертификат ключа загрузки в PEM командой `keytool -exportcert -rfc`.
5. Загрузить в RuStore архив PEPK и PEM-сертификат. Не добавлять keystore, пароли, PEPK-архив или закрытый ключ в Git и не отправлять их в чат.

## 4. Создать приложение и заполнить версию

1. В RuStore Консоли открыть `Приложения → Добавить приложение`.
2. Создать мобильное приложение с выбранным названием.
3. Нажать `Загрузить версию` и загрузить подписанный AAB.
4. Дождаться обработки файла. Обработанная, но не отправленная версия хранится 14 дней.
5. Заполнить `Что нового`, безопасность данных, категорию, возрастное ограничение, описания и контакты по подготовленным файлам.
6. Загрузить иконку и не менее трёх скриншотов телефона; подготовлено восемь.
7. Добавить тестовые аккаунты и пояснение для модератора.
8. Выбрать ручную публикацию, чтобы после успешной модерации выполнить финальную проверку перед открытием доступа.

## 5. Проверить на реальных устройствах

Перед модерацией установить сборку, полученную из подписанного AAB через тестирование RuStore, на два Android-устройства и проверить:

- регистрацию, подтверждение email, вход, выход и восстановление доступа;
- создание пары и вход второго пользователя по коду;
- даты, категории, заметки, чек-листы, желания, фотографии и комментарии;
- локальные напоминания;
- push-уведомления при открытом, свёрнутом и закрытом приложении;
- вопрос дня, раскрытие ответов после ответа обоих и отключение личных вопросов;
- статистику;
- удаление аккаунта и связанных данных.

## 6. Отправить на модерацию

Перед отправкой ещё раз проверить, что версия, описание, политика и декларация данных совпадают с фактическим поведением. После одобрения открыть карточку, проверить её вид и только затем опубликовать вручную.

## Официальные источники

- Регистрация разработчика: https://www.rustore.ru/help/developers/developer-account/registration-developer
- Публикация приложения: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication
- Правила модерации: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/requirement-apps
- Типы данных: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/new-version-app/declare-app-permissions/data-categories
- Типы разрешений: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/new-version-app/declare-app-permissions/permission-types
- Подписи APK и AAB: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/apk-signature
- Загрузка AAB: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/new-version-app/upload-aab
