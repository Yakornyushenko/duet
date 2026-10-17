const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/theme/tokens.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exportsObject,
  Map,
  Object,
  Proxy,
  Reflect,
  require: (name) => {
    assert.equal(name, 'react-native');
    return {
      Platform: { select: (options) => options.default },
      StyleSheet: { create: (styles) => styles },
    };
  },
});

const { colors, createThemedStyles, setActiveTheme, themePalettes } = exportsObject;
const styles = createThemedStyles({
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    color: colors.primary,
    boxShadow: '0 8px 24px rgba(110, 64, 90, 0.08)',
  },
  surface: {
    backgroundColor: colors.surface,
    color: colors.text,
  },
  primaryLabel: {
    color: colors.onPrimary,
  },
  whiteIcon: {
    color: colors.white,
  },
});

assert.equal(colors.primary, '#E85D75');
assert.equal(styles.card.backgroundColor, '#FFF8F3');
assert.equal(styles.card.boxShadow, '0 8px 24px rgba(110, 64, 90, 0.08)');

setActiveTheme('emerald');
assert.equal(colors.primary, '#008668');
assert.equal(styles.card.backgroundColor, '#F6FBF8');
assert.equal(styles.card.borderColor, '#DCE8E2');
assert.equal(styles.card.color, '#008668');
assert.equal(styles.card.boxShadow, '0 8px 24px rgba(54, 95, 84, 0.10)');
assert.equal(themePalettes.emerald.text, '#16221E');
assert.equal(themePalettes.emerald.secondaryPressed, '#B2DDCE');
assert.equal(themePalettes.emerald.dangerSoft, '#FBE9EC');

setActiveTheme('honey');
assert.equal(colors.primary, '#D79A24');
assert.equal(styles.card.backgroundColor, '#FFF8E6');
assert.equal(styles.card.borderColor, '#EADCB7');
assert.equal(styles.card.color, '#D79A24');
assert.equal(styles.card.boxShadow, '0 8px 24px rgba(140, 106, 47, 0.12)');
assert.equal(themePalettes.honey.text, '#2B2419');
assert.equal(themePalettes.honey.primaryPressed, '#B97812');
assert.equal(themePalettes.honey.dangerSoft, '#FBE9EC');

setActiveTheme('sapphire');
assert.equal(colors.primary, '#2563EB');
assert.equal(styles.card.backgroundColor, '#F5F8FF');
assert.equal(styles.card.borderColor, '#D9E2F2');
assert.equal(styles.card.color, '#2563EB');
assert.equal(styles.card.boxShadow, '0 8px 24px rgba(53, 85, 138, 0.12)');
assert.equal(themePalettes.sapphire.text, '#172033');
assert.equal(themePalettes.sapphire.primaryPressed, '#1D4ED8');
assert.equal(themePalettes.sapphire.dangerSoft, '#FBE9EC');

setActiveTheme('terracotta');
assert.equal(colors.primary, '#D65F45');
assert.equal(styles.card.backgroundColor, '#FFF5EE');
assert.equal(styles.card.borderColor, '#EBD8CF');
assert.equal(styles.card.color, '#D65F45');
assert.equal(styles.card.boxShadow, '0 8px 24px rgba(124, 73, 60, 0.12)');
assert.equal(themePalettes.terracotta.text, '#2D211D');
assert.equal(themePalettes.terracotta.primaryPressed, '#B94732');
assert.equal(themePalettes.terracotta.dangerSoft, '#FBE9EC');

setActiveTheme('graphite');
assert.equal(colors.primary, '#F2F2F7');
assert.equal(styles.card.backgroundColor, '#0D0D0F');
assert.equal(styles.card.borderColor, '#38383A');
assert.equal(styles.card.color, '#F2F2F7');
assert.equal(styles.card.boxShadow, '0 8px 24px rgba(0, 0, 0, 0.32)');
assert.equal(styles.surface.backgroundColor, '#1C1C1E');
assert.equal(styles.surface.color, '#F5F5F7');
assert.equal(styles.primaryLabel.color, '#111113');
assert.equal(styles.whiteIcon.color, '#FFFFFF');
assert.equal(themePalettes.graphite.text, '#F5F5F7');
assert.equal(themePalettes.graphite.onPrimary, '#111113');
assert.equal(themePalettes.graphite.danger, '#FF453A');
assert.equal(themePalettes.graphite.dangerSoft, '#3A2022');

setActiveTheme('rose');
assert.equal(styles.card.color, '#E85D75');

const profileSource = fs.readFileSync('app/profile.tsx', 'utf8');
assert.match(profileSource, />Оформление</);
assert.match(profileSource, /<Modal[\s\S]*?visible=\{themePickerVisible\}/);
assert.match(profileSource, /label="Розовая"[\s\S]*?palette=\{themePalettes\.rose\}/);
assert.match(profileSource, /label="Изумрудная"[\s\S]*?palette=\{themePalettes\.emerald\}/);
assert.match(profileSource, /label="Медовая"[\s\S]*?palette=\{themePalettes\.honey\}/);
assert.match(profileSource, /label="Сапфировая"[\s\S]*?palette=\{themePalettes\.sapphire\}/);
assert.match(profileSource, /label="Терракотовая"[\s\S]*?palette=\{themePalettes\.terracotta\}/);
assert.match(profileSource, /label="Графитовая"[\s\S]*?palette=\{themePalettes\.graphite\}/);
assert.match(profileSource, />\s*После смены темы приложение перезапустится\s*</);
assert.match(profileSource, /backgroundColor: pressed \? palette\.primaryPressed : palette\.primary/);
assert.match(profileSource, /profileScrollOffsetToRestore = profileScrollOffset\.current/);
assert.match(profileSource, /PROFILE_THEME_SCROLL_STORAGE_KEY/);
assert.match(profileSource, /AsyncStorage\.setItem\(PROFILE_THEME_SCROLL_STORAGE_KEY/);
assert.match(profileSource, /initialScrollOffset=\{initialScrollOffset\}/);
assert.match(profileSource, /onScrollOffsetChange=\{\(offset\) => \{ profileScrollOffset\.current = offset; \}\}/);

const appScreenSource = fs.readFileSync('src/components/AppScreen.tsx', 'utf8');
assert.match(appScreenSource, /contentOffset=\{initialScrollOffset === undefined \? undefined : \{ x: 0, y: initialScrollOffset \}\}/);
assert.doesNotMatch(appScreenSource, /scrollTo\(\{ y: initialScrollOffset/);
assert.match(appScreenSource, /<AppBackground \/>/);

const themeContextSource = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');
assert.match(themeContextSource, /themeTransitioning: boolean/);
assert.match(themeContextSource, /setTimeout\(resolve, 1000\)/);
assert.match(themeContextSource, /applyThemeAppIcon\(nextTheme, true\)/);
assert.match(themeContextSource, /reloadAppAsync\('Тема приложения изменена'\)/);

const rootLayoutSource = fs.readFileSync('app/_layout.tsx', 'utf8');
assert.match(rootLayoutSource, /themeTransitioning \? \(/);
assert.match(rootLayoutSource, />Применяем тему…</);
assert.match(rootLayoutSource, /<BackgroundProvider>/);

const backgroundContextSource = fs.readFileSync('src/context/BackgroundContext.tsx', 'utf8');
assert.match(backgroundContextSource, /duet:background-pattern/);
assert.match(backgroundContextSource, /'solid' \| 'hearts' \| 'stars' \| 'constellation' \| 'heartsSparkles'/);
assert.match(backgroundContextSource, /AsyncStorage\.setItem\(BACKGROUND_PATTERN_STORAGE_KEY, pattern\)/);

const appBackgroundSource = fs.readFileSync('src/components/AppBackground.tsx', 'utf8');
assert.match(appBackgroundSource, /size: 44, opacity: 0\.06/);
assert.match(appBackgroundSource, /activePattern === 'hearts' \|\| activePattern === 'heartsSparkles'/);
assert.match(appBackgroundSource, /activePattern === 'stars' \|\| activePattern === 'heartsSparkles'/);
assert.match(appBackgroundSource, /activePattern === 'constellation' \? <Constellation \/>/);

assert.match(profileSource, />Фон приложения</);
assert.match(profileSource, />Оформление<[\s\S]*?>Тема приложения<[\s\S]*?>Фон приложения</);
assert.match(profileSource, /visible=\{backgroundPickerVisible\}/);
assert.match(profileSource, /solid: 'Без узора'/);
assert.match(profileSource, /hearts: 'Сердечки'/);
assert.match(profileSource, /stars: 'Звёзды'/);
assert.match(profileSource, /constellation: 'Созвездие'/);
assert.match(profileSource, /heartsSparkles: 'Сердца и искры'/);

const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const dynamicIconPlugin = appConfig.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-awesome-app-icon',
);
assert.equal(dynamicIconPlugin[1].icons.emerald.ios.light, './assets/duet-app-icon-emerald.png');
assert.equal(
  dynamicIconPlugin[1].icons.emerald.android.foregroundImage,
  './assets/duet-icon-foreground-emerald.png',
);
assert.equal(dynamicIconPlugin[1].icons.honey.ios.light, './assets/duet-app-icon-honey.png');
assert.equal(
  dynamicIconPlugin[1].icons.honey.android.foregroundImage,
  './assets/duet-icon-foreground-honey.png',
);
assert.equal(dynamicIconPlugin[1].icons.sapphire.ios.light, './assets/duet-app-icon-sapphire.png');
assert.equal(
  dynamicIconPlugin[1].icons.sapphire.android.foregroundImage,
  './assets/duet-icon-foreground-sapphire.png',
);
assert.equal(dynamicIconPlugin[1].icons.terracotta.ios.light, './assets/duet-app-icon-terracotta.png');
assert.equal(
  dynamicIconPlugin[1].icons.terracotta.android.foregroundImage,
  './assets/duet-icon-foreground-terracotta.png',
);
assert.equal(dynamicIconPlugin[1].icons.graphite.ios.light, './assets/duet-app-icon-graphite.png');
assert.equal(
  dynamicIconPlugin[1].icons.graphite.android.foregroundImage,
  './assets/duet-icon-foreground-graphite.png',
);
assert.equal(dynamicIconPlugin[1].icons.graphite.android.backgroundColor, '#0D0D0F');
const splashPlugin = appConfig.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
);
assert.equal(splashPlugin[1].backgroundColor, '#F7F8F6');
assert.equal(splashPlugin[1].image, './assets/splash-transparent.png');
assert.equal(splashPlugin[1].imageWidth, 1);

const appIconSource = fs.readFileSync('src/services/appIcon.ts', 'utf8');
assert.match(appIconSource, /rose: null/);
assert.match(appIconSource, /emerald: 'emerald'/);
assert.match(appIconSource, /honey: 'honey'/);
assert.match(appIconSource, /sapphire: 'sapphire'/);
assert.match(appIconSource, /terracotta: 'terracotta'/);
assert.match(appIconSource, /graphite: 'graphite'/);
assert.match(appIconSource, /await setAppIcon\(nextIcon, \{ deferUntilBackground: changeOnBackground \}\)/);
assert.match(themeContextSource, /applyThemeAppIcon\(nextTheme, true\)/);
assert.doesNotMatch(themeContextSource, /await applyThemeAppIcon\(nextTheme\);/);

const themeImagesSource = fs.readFileSync('src/theme/images.ts', 'utf8');
for (const file of [
  'assets/duet-birds-emerald.png',
  'assets/invite-partner-emerald.png',
  'assets/wishes-envelope-soft-emerald.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
  assert.match(themeImagesSource, new RegExp(file.split('/').at(-1).replace('.', '\\.')));
}
for (const file of [
  'assets/duet-birds-honey.png',
  'assets/invite-partner-honey.png',
  'assets/wishes-envelope-soft-honey.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
  assert.match(themeImagesSource, new RegExp(file.split('/').at(-1).replace('.', '\\.')));
}
for (const file of [
  'assets/duet-birds-sapphire.png',
  'assets/invite-partner-sapphire.png',
  'assets/wishes-envelope-soft-sapphire.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
  assert.match(themeImagesSource, new RegExp(file.split('/').at(-1).replace('.', '\\.')));
}
for (const file of [
  'assets/duet-birds-terracotta.png',
  'assets/invite-partner-terracotta.png',
  'assets/wishes-envelope-soft-terracotta.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
  assert.match(themeImagesSource, new RegExp(file.split('/').at(-1).replace('.', '\\.')));
}
for (const file of [
  'assets/duet-birds-graphite.png',
  'assets/invite-partner-graphite.png',
  'assets/wishes-envelope-soft-graphite.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
  assert.match(themeImagesSource, new RegExp(file.split('/').at(-1).replace('.', '\\.')));
}
for (const file of [
  'assets/duet-app-icon-emerald.png',
  'assets/duet-icon-foreground-emerald.png',
  'assets/duet-app-icon-honey.png',
  'assets/duet-icon-foreground-honey.png',
  'assets/duet-app-icon-sapphire.png',
  'assets/duet-icon-foreground-sapphire.png',
  'assets/duet-app-icon-terracotta.png',
  'assets/duet-icon-foreground-terracotta.png',
  'assets/duet-app-icon-graphite.png',
  'assets/duet-icon-foreground-graphite.png',
  'assets/splash-transparent.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
}

const appButtonSource = fs.readFileSync('src/components/AppButton.tsx', 'utf8');
assert.match(appButtonSource, /pressedBackgrounds/);
assert.match(appButtonSource, /danger: colors\.dangerSoft/);
assert.match(appButtonSource, /dangerOutline: colors\.dangerSoft/);
assert.match(appButtonSource, /inactive \? colors\.muted/);

const dateCardSource = fs.readFileSync('src/components/DateCard.tsx', 'utf8');
assert.match(dateCardSource, /graphiteHighlighted = highlighted && theme === 'graphite'/);
assert.match(dateCardSource, /theme === 'graphite' \? \[colors\.soft, colors\.surface\] : \[colors\.primary, colors\.secondary\]/);
assert.match(dateCardSource, /highlightedSecondaryColor = graphiteHighlighted \? colors\.secondary : colors\.onPrimary/);

const statisticsSource = fs.readFileSync('app/statistics.tsx', 'utf8');
assert.match(statisticsSource, /heroTextColor = theme === 'graphite' \? colors\.text : colors\.onPrimary/);
assert.match(statisticsSource, /theme === 'graphite' \? \[colors\.soft, colors\.surface\] : \[colors\.primary, colors\.secondary\]/);

assert.match(profileSource, /label="Удалить аккаунт и данные"[\s\S]*?variant="dangerOutline"/);
assert.match(profileSource, /label="Выйти из аккаунта"[\s\S]*?variant="secondary"/);

const segmentedControlSource = fs.readFileSync('src/components/SegmentedControl.tsx', 'utf8');
assert.match(segmentedControlSource, /selectedPressed/);
assert.match(segmentedControlSource, /backgroundColor: colors\.primaryPressed/);

console.log('PASS: theme palettes, themed images, selector and button states');
