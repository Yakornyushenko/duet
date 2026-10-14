# Варианты сборки для магазинов

Проект собирается из одной кодовой базы. Профиль EAS задаёт `EXPO_PUBLIC_STORE`, а конфигурация приложения выбирает нужные название и поведение.

| Профиль EAS | Магазин | `EXPO_PUBLIC_STORE` | Название | Формат |
| --- | --- | --- | --- | --- |
| `production` | Google Play | `google-play` | `Duet` | AAB |
| `rustore` | RuStore | `rustore` | `Дуэт` | AAB |

Обе сборки сохраняют один идентификатор `app.duet.mobile` и используют один release-ключ. Отображаемое название не влияет на совместимость обновлений. Для совместимости важны неизменные package name и подпись.

## Где добавлять следующие различия

- `eas.json` — выбирает магазин для каждого профиля и хранит безопасные несекретные параметры сборки.
- `app.config.js` — нативные различия: название под иконкой, иконки, splash screen, разрешения и другие поля Expo config.
- `src/config/app.ts` — различия внутри интерфейса и бизнес-логики: название, тексты и будущие переключатели функций.
- Файлы карточек магазина и графика хранятся отдельно: `GOOGLE_PLAY_LISTING_RU.md`, `RUSTORE_LISTING_RU.md`, `assets/play-store/`.

Секреты нельзя добавлять в `EXPO_PUBLIC_*`: такие значения встраиваются в приложение и доступны пользователю. Секретные ключи нужно хранить в EAS Environment Variables без префикса `EXPO_PUBLIC_` и читать только там, где они не попадают в клиентский код.

## Локальная проверка вариантов

Google Play:

```powershell
$env:EXPO_PUBLIC_STORE = 'google-play'
pnpm exec expo config --type public
```

RuStore:

```powershell
$env:EXPO_PUBLIC_STORE = 'rustore'
pnpm exec expo config --type public
```

После проверки:

```powershell
Remove-Item Env:EXPO_PUBLIC_STORE
```

## Сборка

```powershell
# Google Play: Duet
pnpm dlx eas-cli@latest build --platform android --profile production

# RuStore: Дуэт
pnpm dlx eas-cli@latest build --platform android --profile rustore
```

Оба профиля используют общий удалённый счётчик `versionCode` и автоматически увеличивают его перед сборкой.

## Официальная документация Expo

- Build profiles и `env`: https://docs.expo.dev/build/eas-json/
- Варианты приложения: https://docs.expo.dev/build-reference/variants/
- Переменные окружения: https://docs.expo.dev/eas/environment-variables/usage/
