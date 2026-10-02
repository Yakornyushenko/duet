const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

(async () => {
  let handler;
  const sent = [];
  const completed = [];
  const jobs = [
    { id: 'q', couple_id: 'pair', recipient_id: 'user', daily_question_id: 'intimate', message: 'DO NOT SEND RAW TEXT' },
    { id: 'cancelled', couple_id: 'pair', recipient_id: 'user', daily_question_id: 'cancelled', message: 'DO NOT SEND' },
    { id: 'wish', couple_id: 'pair', recipient_id: 'user', wish_id: 'wish-id', message: 'Желание обновлено' },
  ];
  const client = {
    async rpc(name, args) {
      if (name === 'enqueue_daily_questions') return { error: null };
      if (name === 'claim_wish_jobs') return { data: jobs };
      if (name === 'daily_question_delivery') return { data: args.p_id === 'cancelled' ? null : 'Для вас новый личный вопрос' };
      throw new Error(name);
    },
    from(table) {
      if (table === 'couple_members') {
        const query = { select() { return query; }, eq() { return query; }, async maybeSingle() { return { data: { user_id: 'user' } }; } };
        return query;
      }
      if (table === 'wish_devices') return { select() { return { async eq() { return { data: [{ token: 'ExpoPushToken[test]' }] }; } }; } };
      if (table === 'wish_jobs') return { update(values) { return { async eq(_, id) { assert.ok(values.completed_at); completed.push(id); return {}; } }; } };
      throw new Error(table);
    },
  };
  const code = ts.transpileModule(fs.readFileSync('supabase/functions/process-wish-jobs/index.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports: {}, console, Response, AbortSignal, Date,
    Deno: { serve(fn) { handler = fn; }, env: { get(key) { return key === 'WISH_WORKER_SECRET' ? 'secret' : 'test'; } } },
    require() { return { createClient() { return client; } }; },
    async fetch(_, options) {
      const messages = JSON.parse(options.body); sent.push(...messages);
      return { ok: true, async json() { return { data: messages.map(() => ({ status: 'ok' })) }; } };
    },
  });
  assert.equal((await handler(new Request('https://test.invalid',{method:'POST'}))).status,401);
  assert.equal(sent.length,0);
  const response = await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-wish-worker-secret':'secret'}}));
  assert.equal(response.status,200);
  assert.equal(sent.length,2);
  assert.equal(sent[0].body,'Для вас новый личный вопрос');
  assert.equal(sent[0].data.questionId,'intimate');
  assert.equal(sent[0].channelId,'daily-questions');
  assert.equal(sent[1].data.wishId,'wish-id');
  assert.equal(sent[1].channelId,'wish-updates');
  assert.equal(completed.length,3);
  console.log('PASS: worker authorization, daily scheduling, consent recheck, private push body, question deep link, existing wish delivery');
})().catch(error => { console.error(error); process.exitCode=1; });
