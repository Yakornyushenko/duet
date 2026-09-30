const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => {
    assert.ok(dependencies[name], `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

const { isChecklistComplete } = load('src/utils/notes.ts');
assert.equal(isChecklistComplete({ kind: 'checklist', items: [] }), false);
assert.equal(isChecklistComplete({ kind: 'checklist', items: [{ done: true }, { done: false }] }), false);
assert.equal(isChecklistComplete({ kind: 'checklist', items: [{ done: true }, { done: true }] }), true);
assert.equal(isChecklistComplete({ kind: 'text', items: [{ done: true }] }), false);

const dates = load('src/utils/dates.ts');
const { summarizeStatistics } = load('src/utils/statistics.ts', { '@/utils/dates': dates });
const data = {
  dates: [
    { id: 'd1', category: 'dates', icon: 'heart', title: 'Вечер' },
    { id: 'd2', category: 'travel', icon: 'plane', title: 'Поездка' },
    { id: 'd3', category: 'other', icon: 'sparkles', title: 'Без подтверждения' },
  ],
  completions: [
    { id: 'c1', event_id: 'd1', happened_on: '2026-09-01' },
    { id: 'c2', event_id: 'd1', happened_on: '2025-09-01' },
    { id: 'c3', event_id: 'd2', happened_on: '2026-08-30' },
    { id: 'future', event_id: 'd2', happened_on: '2026-10-01' },
    { id: 'gone', event_id: 'deleted', happened_on: '2026-09-01' },
  ],
  wishes: [
    { id: 'w1', title: 'Сбылось', fulfilled: true, list: 'together', fulfilled_at: '2026-09-10T12:00:00Z' },
    { id: 'w2', title: 'Старое', fulfilled: true, list: 'creator', fulfilled_at: null },
    { id: 'w3', title: 'План', fulfilled: false, list: 'partner', fulfilled_at: null },
  ],
};
const now = new Date(2026, 8, 30, 12);
const all = summarizeStatistics(data, 'all', now);
assert.equal(all.total, 5);
assert.equal(all.dates, 2, 'Annual events only count explicitly confirmed occurrences');
assert.equal(all.travels, 1);
assert.equal(all.otherEvents, 0, 'Unconfirmed dates never count');
assert.equal(all.wishes, 2);
assert.equal(all.undated, 1);
assert.equal(all.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 3, 'Chart excludes unknown dates and old history outside 12 months');
const month = summarizeStatistics(data, 'month', now);
assert.equal(all.categoryCounts.dates, 2);
assert.equal(all.categoryCounts.travel, 1);
const customData = {
  ...data,
  dates: [...data.dates, { id: 'custom-event', category: 'custom-category', title: 'Театр', icon: 'heart' }],
  completions: [...data.completions, { id: 'custom-done', event_id: 'custom-event', happened_on: '2026-09-15' }],
};
const custom = summarizeStatistics(customData, 'month', now);
assert.equal(custom.categoryCounts['custom-category'], 1, 'Custom categories keep their own count');
assert.equal(Object.values(custom.categoryCounts).reduce((sum, count) => sum + count, 0) + custom.wishes, custom.total);
const removed = summarizeStatistics({ ...customData, dates: data.dates }, 'month', now);
assert.equal(removed.categoryCounts['custom-category'], undefined, 'Removed events no longer contribute');
assert.equal(removed.total, custom.total - 1);
assert.equal(month.total, 2);
assert.equal(month.wishes, 1, 'Unknown completion dates are all-time only');
assert.equal(month.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 2);
assert.equal(summarizeStatistics(data, 'year', now).total, 3);
assert.equal(summarizeStatistics({ wishes: [], dates: [], completions: [] }, 'all', now).total, 0);
assert.equal(all.moments.at(-1).date, null, 'Unknown dates sort after dated moments');
const migration = fs.readFileSync('supabase/migrations/20261001000000_couple_history.sql', 'utf8');
assert.ok(migration.includes('unique(event_id, happened_on)'));
assert.ok(migration.includes('enable row level security'));
assert.ok(migration.includes('not public.is_couple_member(event.couple_id)'));
assert.ok(migration.includes('new.fulfilled_at := old.fulfilled_at'));
console.log('PASS: checklist icons, confirmed-only history, date ranges, unknown dates, annual occurrences, empty state, chart totals');
