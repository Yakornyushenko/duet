const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const appJson = require('../app.json').expo;
const eas = require('../eas.json');
const configureApp = require('../app.config.js');

function getNativeConfig(store) {
  const previousStore = process.env.EXPO_PUBLIC_STORE;
  process.env.EXPO_PUBLIC_STORE = store;
  try {
    return configureApp({ config: structuredClone(appJson) });
  } finally {
    if (previousStore === undefined) delete process.env.EXPO_PUBLIC_STORE;
    else process.env.EXPO_PUBLIC_STORE = previousStore;
  }
}

function getRuntimeConfig(store) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/config/app.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, process: { env: { EXPO_PUBLIC_STORE: store } } });
  return exports;
}

assert.equal(eas.build.production.env.EXPO_PUBLIC_STORE, 'google-play');
assert.equal(eas.build.rustore.env.EXPO_PUBLIC_STORE, 'rustore');
assert.equal(eas.build.production.autoIncrement, true);
assert.equal(eas.build.rustore.autoIncrement, true);
assert.equal(eas.build.rustore.android.buildType, 'app-bundle');

const googleNative = getNativeConfig('google-play');
const rustoreNative = getNativeConfig('rustore');
assert.equal(googleNative.name, 'Duet');
assert.equal(rustoreNative.name, 'Дуэт');
assert.equal(googleNative.android.package, 'app.duet.mobile');
assert.equal(rustoreNative.android.package, googleNative.android.package);

assert.equal(getRuntimeConfig('google-play').appName, 'Duet');
assert.equal(getRuntimeConfig('rustore').appName, 'Дуэт');
assert.throws(() => getNativeConfig('unknown'), /Unknown EXPO_PUBLIC_STORE/);
assert.throws(() => getRuntimeConfig('unknown'), /Unknown EXPO_PUBLIC_STORE/);

console.log('PASS: Google Play and RuStore builds keep one package while using store-specific names');
