const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

(async () => {
  let handler;
  let storageFailure = false;
  let finalizeFailure = false;
  const removed = [];
  const rpcCalls = [];
  const deletedUsers = [];
  const sessionClient = {
    auth: { async getUser() { return { data: { user: { id: 'user-id' } }, error: null }; } },
  };
  const adminClient = {
    async rpc(name, args) {
      assert.equal(args.p_user_id, 'user-id');
      rpcCalls.push(name);
      if (name === 'begin_account_deletion') {
        return { data: ['workspace/user-id/one.jpg', 'workspace/user-id/two.jpg'], error: null };
      }
      assert.equal(name, 'finalize_account_deletion');
      return finalizeFailure
        ? { data: null, error: { message: 'finalize failed' } }
        : { data: null, error: null };
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'wish-photos');
        return { async remove(paths) {
          removed.push(...paths);
          return storageFailure ? { error: { message: 'storage failed' } } : { error: null };
        } };
      },
    },
    auth: { admin: { async deleteUser(id, shouldSoftDelete) {
      assert.equal(shouldSoftDelete, false);
      deletedUsers.push(id);
      return { error: null };
    } } },
  };
  const code = ts.transpileModule(fs.readFileSync('supabase/functions/delete-account/index.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports: {}, console, Response, Request,
    Deno: {
      serve(fn) { handler = fn; },
      env: { get(key) { return ({
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
        SUPABASE_SERVICE_ROLE_KEY: 'service',
      })[key]; } },
    },
    require() { return { createClient(_url, key) { return key === 'anon' ? sessionClient : adminClient; } }; },
  });

  assert.equal((await handler(new Request('https://test.invalid', { method: 'OPTIONS' }))).status, 200);
  assert.equal((await handler(new Request('https://test.invalid', { method: 'POST' }))).status, 401);
  assert.equal((await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer token' }, body: '{}',
  }))).status, 400);

  const validRequest = () => new Request('https://test.invalid', {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE_MY_ACCOUNT' }),
  });
  const success = await handler(validRequest());
  assert.equal(success.status, 200);
  assert.deepEqual(removed, ['workspace/user-id/one.jpg', 'workspace/user-id/two.jpg']);
  assert.deepEqual(rpcCalls, ['begin_account_deletion', 'finalize_account_deletion']);
  assert.deepEqual(deletedUsers, ['user-id']);

  storageFailure = true;
  const failed = await handler(validRequest());
  assert.equal(failed.status, 500);
  assert.deepEqual(rpcCalls, [
    'begin_account_deletion',
    'finalize_account_deletion',
    'begin_account_deletion',
  ]);
  assert.equal(deletedUsers.length, 1, 'Auth user is retained when photo cleanup fails');

  storageFailure = false;
  finalizeFailure = true;
  const finalizeFailed = await handler(validRequest());
  assert.equal(finalizeFailed.status, 500);
  assert.deepEqual(rpcCalls.slice(-2), ['begin_account_deletion', 'finalize_account_deletion']);
  assert.equal(deletedUsers.length, 1, 'Auth user is retained when database cleanup fails');

  const migration = fs.readFileSync('supabase/migrations/20261002000000_account_deletion.sql', 'utf8');
  assert.match(migration, /auth\.jwt\(\) ->> 'role'.*service_role/s);
  assert.match(migration, /revoke all on function public\.begin_account_deletion\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.finalize_account_deletion\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.begin_account_deletion\(uuid\) to service_role/);
  assert.match(migration, /grant execute on function public\.finalize_account_deletion\(uuid\) to service_role/);
  assert.match(migration, /account_deletion_jobs where user_id = auth\.uid\(\)/, 'Refresh cannot recreate a workspace mid-deletion');
  assert.ok(
    migration.indexOf('select couple_id into workspace') < migration.indexOf('account_deletion_jobs where user_id = auth.uid()'),
    'An existing workspace remains usable until final cleanup starts',
  );
  assert.match(migration, /select photo_paths into user_photo_paths[\s\S]*where user_id = p_user_id;[\s\S]*if not found then/);
  assert.match(migration, /delete from public\.daily_question_answers where user_id = p_user_id/);
  assert.match(migration, /delete from public\.date_events where created_by = p_user_id/);
  assert.match(migration, /delete from public\.wishes where created_by = p_user_id/);
  assert.match(migration, /delete from public\.wish_devices where user_id = p_user_id/);
  assert.match(migration, /set created_by = \(/);
  assert.match(migration, /split_part\(name, '\/', 2\) = p_user_id::text/);
  assert.match(migration, /photos && user_photo_paths/);
  assert.match(migration, /remove_photos && user_photo_paths/);
  assert.match(fs.readFileSync('src/context/AppContext.tsx', 'utf8'), /await AsyncStorage\.clear\(\)/);
  console.log('PASS: authenticated confirmation, two-phase retry-safe cleanup, admin deletion, service-role SQL boundary');
})().catch((error) => { console.error(error); process.exitCode = 1; });
