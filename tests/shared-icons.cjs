const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/entityIcons.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const { entityIcons, entityIconLabels, entityIconGroups, defaultEntityIcons } = exportsObject;
const names = Object.keys(entityIcons);
assert.equal(names.length, 45);
assert.deepEqual([...entityIconGroups.date].slice(0, 3), ['heart', 'cake', 'plane']);
assert.deepEqual([...entityIconGroups.wish].slice(0, 3), ['sparkles', 'gift', 'camera']);
assert.deepEqual([...entityIconGroups.note].slice(0, 3), ['note', 'checklist', 'idea']);
for (const group of Object.values(entityIconGroups)) assert.equal(group.length, 15);
assert.equal(new Set(Object.values(entityIconGroups).flat()).size, 45);
assert.equal(defaultEntityIcons.date, 'heart');
assert.equal(defaultEntityIcons.wish, 'sparkles');
assert.equal(defaultEntityIcons.note, 'note');
const glyphs = JSON.parse(fs.readFileSync('node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json', 'utf8'));
const detailsMigration = fs.readFileSync('supabase/migrations/20261014020000_date_details_note_icons.sql', 'utf8');
const moreIconsMigration = fs.readFileSync('supabase/migrations/20261014030000_more_entity_icons.sql', 'utf8');
for (const name of names) {
  assert.ok(entityIconLabels[name], `Missing label for ${name}`);
  assert.ok(glyphs[entityIcons[name]], `Missing glyph for ${name}`);
}
assert.ok(detailsMigration.includes('add column description'));
assert.ok(detailsMigration.includes('add column icon'));
assert.ok(detailsMigration.includes('p_icon text'));
for (const name of entityIconGroups.note) {
  assert.ok(`${detailsMigration}\n${moreIconsMigration}`.includes(`'${name}'`), `Missing allowed note icon ${name}`);
}
console.log('PASS: entity-specific icon groups, glyphs, date descriptions, and note icon persistence');
