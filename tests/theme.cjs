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

setActiveTheme('rose');
assert.equal(styles.card.color, '#E85D75');

const profileSource = fs.readFileSync('app/profile.tsx', 'utf8');
assert.match(profileSource, />Оформление</);
assert.match(profileSource, /<Modal[\s\S]*?visible=\{themePickerVisible\}/);
assert.match(profileSource, /label="Розовая"[\s\S]*?palette=\{themePalettes\.rose\}/);
assert.match(profileSource, /label="Изумрудная"[\s\S]*?palette=\{themePalettes\.emerald\}/);
assert.match(profileSource, /label="Медовая"[\s\S]*?palette=\{themePalettes\.honey\}/);
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

const themeContextSource = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');
assert.match(themeContextSource, /themeTransitioning: boolean/);
assert.match(themeContextSource, /setTimeout\(resolve, 1000\)/);
assert.match(themeContextSource, /applyThemeAppIcon\(nextTheme, true\)/);
assert.match(themeContextSource, /reloadAppAsync\('Тема приложения изменена'\)/);

const rootLayoutSource = fs.readFileSync('app/_layout.tsx', 'utf8');
assert.match(rootLayoutSource, /themeTransitioning \? \(/);
assert.match(rootLayoutSource, />Применяем тему…</);

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
  'assets/duet-app-icon-emerald.png',
  'assets/duet-icon-foreground-emerald.png',
  'assets/duet-app-icon-honey.png',
  'assets/duet-icon-foreground-honey.png',
  'assets/splash-transparent.png',
]) {
  assert.ok(fs.statSync(file).size > 0, `${file} must be a non-empty image`);
}

const appButtonSource = fs.readFileSync('src/components/AppButton.tsx', 'utf8');
assert.match(appButtonSource, /pressedBackgrounds/);
assert.match(appButtonSource, /danger: colors\.dangerSoft/);
assert.match(appButtonSource, /dangerOutline: colors\.dangerSoft/);
assert.match(appButtonSource, /inactive \? colors\.muted/);

assert.match(profileSource, /label="Удалить аккаунт и данные"[\s\S]*?variant="dangerOutline"/);
assert.match(profileSource, /label="Выйти из аккаунта"[\s\S]*?variant="secondary"/);

const segmentedControlSource = fs.readFileSync('src/components/SegmentedControl.tsx', 'utf8');
assert.match(segmentedControlSource, /selectedPressed/);
assert.match(segmentedControlSource, /backgroundColor: colors\.primaryPressed/);

console.log('PASS: theme palettes, themed images, selector and button states');
