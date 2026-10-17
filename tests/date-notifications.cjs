const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20261017010000_date_created_notifications.sql', 'utf8');
const worker = fs.readFileSync('supabase/functions/process-wish-jobs/index.ts', 'utf8');
const reminderContext = fs.readFileSync('src/context/ReminderContext.tsx', 'utf8');

assert.match(migration, /after insert on public\.date_events/);
assert.match(migration, /user_id <> new\.created_by/);
assert.match(migration, /'date_created'/);
assert.match(migration, /Добавлена дата:/);
assert.doesNotMatch(migration, /after update on public\.date_events/);
assert.match(worker, /date_event_id \? 'date-updates'/);
assert.match(worker, /\{ eventId: job\.date_event_id \}/);
assert.match(reminderContext, /configureDateUpdatesChannel/);

console.log('PASS: new dates notify only the partner and open the created event');
