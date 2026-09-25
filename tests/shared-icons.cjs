const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/eventIcons.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const { eventIcons, iconLabels } = exportsObject;
const names = Object.keys(eventIcons);
assert.equal(names.length, 15);
assert.deepEqual(names.slice(0, 5), ['heart', 'sparkles', 'gift', 'cake', 'plane']);
const glyphs = JSON.parse(fs.readFileSync('node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json', 'utf8'));
const migration = fs.readFileSync('supabase/migrations/20260925000000_shared_icons.sql', 'utf8');
for (const name of names) {
  assert.ok(iconLabels[name], `Missing label for ${name}`);
  assert.ok(glyphs[eventIcons[name]], `Missing glyph for ${name}`);
}
for (const name of names.slice(5)) {
  assert.ok(migration.includes(`add value if not exists '${name}'`), `Missing database icon ${name}`);
}
assert.ok(migration.includes('grant update (icon)'));
assert.ok(migration.includes('old.fulfilled, old.icon'));
assert.ok(migration.includes('new.fulfilled, new.icon'));
console.log('PASS: 15 glyphs and labels, original row, database values, update permissions and notification comparison');
