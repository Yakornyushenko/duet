const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/calendar.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exportsObject,
  require(name) {
    assert.equal(name, '@/utils/dates');
    return {
      parseDateOnly: (value) => new Date(`${value}T12:00:00`),
      toDateOnly: (value) => {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },
    };
  },
});

const { eventOccursOnDate, getCalendarMonthDays } = exportsObject;
const october = getCalendarMonthDays(2026, 9);
assert.equal(october.length, 42);
assert.equal(october[0].dateKey, '2026-09-28', 'Calendar weeks start on Monday');
assert.equal(october[3].dateKey, '2026-10-01');
assert.equal(october[3].inCurrentMonth, true);

const yearly = { eventDate: '2024-10-17', recurrence: 'yearly' };
const oneTime = { eventDate: '2026-10-17', recurrence: 'none' };
assert.equal(eventOccursOnDate(yearly, new Date(2030, 9, 17, 12)), true);
assert.equal(eventOccursOnDate(oneTime, new Date(2026, 9, 17, 12)), true);
assert.equal(eventOccursOnDate(oneTime, new Date(2027, 9, 17, 12)), false);

const tabs = fs.readFileSync('app/(tabs)/_layout.tsx', 'utf8');
const more = fs.readFileSync('app/(tabs)/more.tsx', 'utf8');
const calendarScreen = fs.readFileSync('app/(tabs)/calendar.tsx', 'utf8');
const dateForm = fs.readFileSync('app/date-form.tsx', 'utf8');
assert.match(tabs, /name="dates"[\s\S]*href: null/);
assert.match(tabs, /name="calendar"[\s\S]*title: 'Календарь'/);
assert.ok(more.indexOf('Открыть вопрос дня') < more.indexOf('Открыть даты'));
assert.match(calendarScreen, /const openDateForm = \(\) =>/);
assert.match(calendarScreen, /accessibilityLabel="Добавить событие на выбранный день"/);
assert.doesNotMatch(calendarScreen, /emptyAddLabel/);
assert.match(calendarScreen, /PanResponder\.create/);
assert.match(calendarScreen, /gesture\.dx <= -60/);
assert.match(calendarScreen, /gesture\.dx >= 60/);
assert.match(calendarScreen, /Animated\.timing\(todayButtonProgress/);
assert.match(calendarScreen, /todayButtonSlot: \{[\s\S]*height: 30/);
assert.match(calendarScreen, /accessibilityLabel="Вернуться к сегодняшней дате"/);
assert.match(calendarScreen, /name="arrow-undo-outline"/);
assert.match(calendarScreen, /hasEvents && styles\.plannedDay/);
assert.match(calendarScreen, /plannedDayText: \{ color: colors\.primary, fontWeight: '700' \}/);
assert.doesNotMatch(calendarScreen, /eventDot/);
assert.match(dateForm, /existingEvent\?\.eventDate \?\? initialDate/);
assert.match(dateForm, /existingEvent\?\.recurrence \?\? 'none'/);
assert.ok(dateForm.indexOf("label: 'Один раз'") < dateForm.indexOf("label: 'Каждый год'"));

console.log('PASS: month grid, recurrence marks, calendar tab and dates placement');
