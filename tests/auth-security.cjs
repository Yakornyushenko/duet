const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, URLSearchParams, console, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name];
  } });
  return exports;
}
function memory() {
  const entries = new Map();
  return { entries, async getItem(k) { return entries.get(k) ?? null; },
    async setItem(k,v) { entries.set(k,v); }, async removeItem(k) { entries.delete(k); } };
}
(async () => {
  const { createSecureSessionStorage } = load('src/lib/secureSessionStorage.ts');
  const secure = memory(), legacy = memory();
  let generation = 0;
  const storage = createSecureSessionStorage(secure, legacy, () => `g-${++generation}`);
  const value = 'a'.repeat(399) + '🌅'.repeat(2500) + 'Привет';
  await legacy.setItem('session', value);
  assert.equal(await storage.getItem('session'), value);
  assert.equal(await legacy.getItem('session'), null);
  for (const chunk of secure.entries.values()) assert.ok(Buffer.byteLength(chunk) < 2048);
  const set = secure.setItem;
  secure.setItem = async (key, data) => { if (key.endsWith('.1')) throw Error('disk'); await set(key,data); };
  await assert.rejects(storage.setItem('session', 'b'.repeat(900)));
  assert.equal(await storage.getItem('session'), value, 'Failed replacement preserves old session');
  await legacy.setItem('new', value);
  await assert.rejects(storage.getItem('new'));
  assert.equal(await legacy.getItem('new'), value, 'Failed migration preserves legacy value');
  secure.setItem = set;
  await storage.removeItem('session');
  await legacy.setItem('session', 'stale');
  assert.equal(await storage.getItem('session'), null, 'Logout tombstone prevents resurrection');
  await Promise.all([storage.setItem('session','one'),storage.setItem('session','two')]);
  assert.equal(await storage.getItem('session'),'two');
  const manifest = JSON.parse(await secure.getItem('duet.secure.session'));
  await secure.removeItem(`duet.secure.session.${manifest.generation}.0`);
  await assert.rejects(storage.getItem('session'), 'Missing encrypted chunk fails closed');
  const { isAuthConfirmationLink, getEmailConfirmationError } = load('src/utils/authLink.ts');
  assert.equal(isAuthConfirmationLink('duet://auth#access_token=attacker'),true);
  for (const url of ['https://auth','duet://evil','duet://auth.evil','duet://auth/other','duet://user@auth','garbage']) {
    assert.equal(isAuthConfirmationLink(url),false);
  }
  assert.equal(getEmailConfirmationError('https://duet.by/email-confirmed#access_token=test'), null);
  assert.match(
    getEmailConfirmationError('https://duet.by/email-confirmed#error=access_denied&error_code=otp_expired'),
    /самую свежую ссылку/,
  );
  const { localizeAuthError, isEmailNotConfirmedError } = load('src/utils/authErrors.ts');
  const emailNotConfirmed = localizeAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' });
  assert.equal(emailNotConfirmed.message, 'Почта не подтверждена. Запросите новое письмо и откройте самую свежую ссылку.');
  assert.equal(isEmailNotConfirmedError(emailNotConfirmed), true);
  assert.equal(localizeAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }).message, 'Неверный email или пароль.');
  const backend = fs.readFileSync('src/services/backend.ts','utf8');
  const context = fs.readFileSync('src/context/AppContext.tsx','utf8');
  assert.ok(!backend.includes('setSession('), 'No token adoption from links');
  assert.ok(!context.includes('unregisterWishPushDevice'), 'Logout not gated on remote push cleanup');
  const local = memory();
  let stopped = false, signedOut = false, options;
  const client = { auth: {
    async stopAutoRefresh() { stopped=true; },
    async signOut() {
      assert.equal(await options.auth.storage.getItem('duet-auth-token'),null);
      await options.auth.storage.setItem('duet-auth-token','late-refresh');
      signedOut=true; return {error:null};
    },
  }};
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/supabase.ts','utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText, {exports, URL, console,
    process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://test.supabase.co',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public'}},
    require: name => name==='./authStorage' ? {authStorage:local} : {createClient:(_url,_key,config)=>{options=config; return client;}},
    fetch:()=>{throw Error('Network must not be used for local logout');},
  });
  await local.setItem(exports.sessionStorageKey,JSON.stringify({access_token:'test'}));
  assert.equal(await exports.clearLocalSession(),'test');
  assert.ok(stopped && signedOut);
  assert.equal(await local.getItem(exports.sessionStorageKey),null);
  assert.equal(exports.isSessionEnabled(),false);
  exports.enableSession();
  assert.equal(exports.isSessionEnabled(),true);
  console.log('PASS: secure migration, Unicode/large sessions, interrupted write, logout tombstone, strict links, offline logout and refresh gate');
})().catch(error=>{console.error(error);process.exitCode=1;});
