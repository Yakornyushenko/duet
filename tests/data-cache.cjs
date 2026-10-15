const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const storage = new Map();
const AsyncStorage = {
  getItem: async (key) => storage.get(key) ?? null,
  setItem: async (key, value) => { storage.set(key, value); },
  removeItem: async (key) => { storage.delete(key); },
  getAllKeys: async () => [...storage.keys()],
  multiRemove: async (keys) => { keys.forEach((key) => storage.delete(key)); },
};

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/dataCache.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: exportsObject,
  console,
  AbortController,
  Date,
  JSON,
  encodeURIComponent,
  require(name) {
    if (name === '@react-native-async-storage/async-storage') return AsyncStorage;
    throw new Error('Unexpected import: ' + name);
  },
});

(async () => {
  const key = exportsObject.dataCacheKey('wishes', 'couple/1');
  assert.match(key, /^duet:data:v1:/);

  const fresh = await exportsObject.loadWithCache(key, async () => ['fresh']);
  assert.deepEqual(fresh, ['fresh']);
  assert.deepEqual(await exportsObject.readCachedData(key), ['fresh']);

  const fallback = await exportsObject.loadWithCache(key, async () => {
    throw new TypeError('Network request failed');
  });
  assert.deepEqual(fallback, ['fresh']);

  assert.deepEqual(await exportsObject.loadWithCache(key, async () => {
    throw { code: '', details: '', hint: '', message: 'TypeError: Network request failed' };
  }), ['fresh'], 'Supabase wraps fetch failures in a PostgREST-shaped object');

  const timeout = new Error('request timed out');
  timeout.name = 'TimeoutError';
  assert.deepEqual(await exportsObject.loadWithCache(key, async () => {
    throw timeout;
  }), ['fresh']);

  assert.deepEqual(await exportsObject.loadWithCache(key, async () => {
    throw { status: 503, message: 'service unavailable' };
  }), ['fresh']);

  await assert.rejects(exportsObject.loadWithCache(key, async () => {
    throw new Error('unexpected application failure');
  }), /unexpected application failure/);

  await assert.rejects(exportsObject.loadWithCache(key, async () => {
    throw { status: 401, message: 'unauthorized' };
  }), (error) => error.status === 401);

  await assert.rejects(exportsObject.loadWithCache(key, async () => {
    throw { code: '42501', details: null, hint: null, message: 'permission denied' };
  }), (error) => error.code === '42501');

  await assert.rejects(exportsObject.loadWithCache(key, async () => {
    throw { code: 'PGRST204', details: null, hint: null, message: 'column not found' };
  }), (error) => error.code === 'PGRST204');

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(exportsObject.loadWithCache(key, async () => {
    throw new Error('cancelled');
  }, controller.signal), /cancelled/);

  storage.set('unrelated', 'keep');
  await exportsObject.clearDataCache();
  assert.equal(storage.has(key), false);
  assert.equal(storage.get('unrelated'), 'keep');
  console.log('PASS: explicit network fallback, PostgREST safety, cancellation, scoped cleanup');
})().catch((error) => { console.error(error); process.exitCode = 1; });
