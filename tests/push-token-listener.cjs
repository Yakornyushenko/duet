const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/services/notificationApi.native.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

async function main() {
  let handler;
  let calls = 0;
  let removed = false;
  let resolvePending;
  const notifications = {
    setNotificationHandler() {},
    addPushTokenListener(callback) {
      handler = callback;
      return { remove() { removed = true; } };
    },
    async getExpoPushTokenAsync(options) {
      calls++;
      // Real Android re-emits onDevicePushToken if no native token is supplied.
      assert.ok(options.devicePushToken, 'Must use event token, not fetch it again');
      if (options.devicePushToken.data === 'pending') {
        await new Promise((resolve) => { resolvePending = resolve; });
      }
      return { data: 'ExpoPushToken[test]' };
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports, console,
    require(name) {
      if (name === 'expo-notifications') return notifications;
      if (name === 'expo-constants') return { default: { easConfig: { projectId: 'test' } } };
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      throw new Error('Unexpected import: ' + name);
    },
  });
  const received = [];
  const subscription = exports.addPushTokenListener((token) => received.push(token));
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  handler({ type: 'android', data: 'first' });
  await flush();
  assert.equal(calls, 1);
  assert.equal(received.length, 1);
  handler({ type: 'android', data: 'first' });
  await flush();
  assert.equal(calls, 1, 'Duplicate token must not start another registration');
  handler({ type: 'android', data: 'rotated' });
  await flush();
  assert.equal(received.length, 2, 'Real token rotation must still work');
  handler({ type: 'android', data: 'pending' });
  subscription.remove();
  resolvePending();
  await flush();
  assert.equal(received.length, 2, 'No callback after unsubscribe');
  assert.ok(removed);
  console.log('PASS: event payload reuse, deduplication, rotation, unsubscribe');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
