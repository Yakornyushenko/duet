# Выпуск Duet в Google Play

Актуально на 2 октября 2026 года.

## Что уже готово

- Android package: `app.duet.mobile`.
- Expo-проект привязан к EAS: `gasello/duet`.
- Профиль `production` создаёт подписанный Android App Bundle (`.aab`) и автоматически увеличивает `versionCode`.
- Проект использует Expo SDK 57 и Android target API 36.
- Иконка и adaptive icon настроены.
- Push-уведомления подключены через Firebase/FCM.
- Неиспользуемые разрешения камеры, микрофона и показа поверх других приложений заблокированы.

## Блокеры до публичного релиза

1. В Play Console указать опубликованную политику конфиденциальности: `https://duet-app.pages.dev/privacy`. Email настроен локально и в EAS; ссылки внутри приложения добавлены на экран регистрации и в раздел «Ещё».
2. Применить миграцию `20261002000000_account_deletion.sql`, развернуть Edge Function `delete-account` и проверить удаление на тестовой паре. Кнопка и внешняя страница `/delete-account` уже реализованы.
3. Перенести подготовленные ответы из `GOOGLE_PLAY_DATA_SAFETY.md` в Play Console. Для удаления аккаунта использовать `https://duet-app.pages.dev/delete-account`.
4. Проверить production-конфигурацию Supabase, RLS, миграции и доставку push на двух реальных устройствах.
5. Снять шесть скриншотов на Android с демонстрационными данными и указать email поддержки. Описание, иконка и feature graphic подготовлены в `GOOGLE_PLAY_LISTING_RU.md` и `assets/play-store`.
6. Для нового личного аккаунта провести закрытый тест минимум с 12 участниками непрерывно 14 дней.

## 1. Подготовить аккаунты

- Нужен аккаунт Expo с доступом к проекту `gasello/duet`.
- Нужен Google Play Console developer account. Регистрация Google Play оплачивается отдельно.
- В Play Console создать приложение с package `app.duet.mobile`. Package после первой публикации менять нельзя.
- При первой загрузке включить Play App Signing. EAS-ключ при этом используется как upload key.

## 2. Настроить production environment в EAS

Файл `.env` не загружается в облачную сборку. В Expo dashboard откройте проект Duet → Project settings → Environment variables и создайте для окружения `production`:

- `EXPO_PUBLIC_SUPABASE_URL` — plain text или sensitive;
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — plain text или sensitive;
- `EXPO_PUBLIC_SUPPORT_EMAIL` — публичный email для обращений по конфиденциальности;
- `GOOGLE_SERVICES_JSON` — file variable, загрузив локальный `google-services.json`.

`EXPO_PUBLIC_*` попадают в клиентское приложение и не должны содержать service role key или другие серверные секреты.

Проверить названия переменных без вывода их значений:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest env:list --environment production
```

## 3. Настроить подпись и FCM

```bash
npx eas-cli@latest credentials --platform android
```

- Для Android build credentials разрешить EAS создать новый keystore, если релизного ключа ещё нет.
- Сохранить резервную копию keystore и паролей в защищённом хранилище.
- Отдельно загрузить Firebase service account key для FCM V1. Не добавлять этот приватный JSON в репозиторий и не передавать его в чат.

## 4. Собрать тестовый APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

Установить APK минимум на два телефона и пройти основной сценарий:

- регистрация, подтверждение email, вход и выход;
- создание пары и присоединение второго пользователя;
- даты, заметки, желания и фотографии;
- локальные напоминания;
- push между двумя пользователями при открытом, свёрнутом и закрытом приложении;
- повторный вход после перезапуска;
- удаление аккаунта и проверка удаления связанных данных после реализации этой функции.

## 5. Собрать App Bundle

Перед сборкой:

```bash
pnpm run typecheck
pnpm exec expo install --check
```

Production-сборка:

```bash
npx eas-cli@latest build --platform android --profile production
```

Результатом должен быть подписанный `.aab`. APK из профиля `preview` в Google Play загружать нельзя.

## 6. Загрузить во внутреннее тестирование

Сначала создать приложение в Play Console и настроить Google Play service account для EAS Submit. Затем:

```bash
npx eas-cli@latest submit --platform android --profile production --latest
```

Первую сборку выпускать во внутренний тест. После загрузки проверить App Bundle Explorer, список поддерживаемых устройств, предупреждения по разрешениям и pre-launch report.

## 7. Заполнить Play Console

- App access: дать ревьюеру рабочий тестовый доступ или точные шаги регистрации и создания пары.
- Ads: указать, что рекламы нет, если она не будет добавлена до релиза.
- Content rating: пройти анкету по фактическому содержимому.
- Target audience: указать реальную возрастную аудиторию; приложение не позиционировать для детей без отдельной проверки требований Families.
- Data safety: ответы должны совпадать с кодом, Supabase, Firebase/Expo push и политикой конфиденциальности.
- Account deletion: указать путь удаления в приложении и URL внешней страницы удаления.

## 8. Перейти к production

После внутреннего теста провести закрытый тест, исправить crash/ANR и замечания pre-launch report. Для аккаунтов, подпадающих под обязательное тестирование, держать минимум 12 участников в closed testing непрерывно 14 дней, затем запросить production access. Первый публичный релиз лучше раскатывать поэтапно.

## Официальные источники

- Expo: https://docs.expo.dev/submit/android/
- Expo environment variables: https://docs.expo.dev/eas/environment-variables/
- Google Play target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Google Play testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Android app signing: https://developer.android.com/studio/publish/app-signing
