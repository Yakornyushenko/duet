// Local, disposable PostgreSQL test. Never connects to Supabase or reads .env.
// Install test-only runtime: npm install --prefix .android-bootstrap/merge-test --no-save @electric-sql/pglite
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('../.android-bootstrap/merge-test/node_modules/@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage; create schema extensions;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth,storage to authenticated,anon,service_role;
      grant execute on function auth.uid() to public;
      -- Test substitute for pgcrypto only; application SQL is otherwise unmodified.
      create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$
        select substring(decode(replace(gen_random_uuid()::text,'-',''),'hex') from 1 for n) $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant select,insert,delete on storage.objects to authenticated;
      create function storage.foldername(name text) returns text[] language sql immutable as $$
        select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
      create publication supabase_realtime;
    `);
    const migrations = path.join(__dirname,'../supabase/migrations');
    for (const name of fs.readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort()) {
      const sql = fs.readFileSync(path.join(migrations,name),'utf8').replace(/create extension if not exists pgcrypto;/i,'');
      try { await db.exec(sql); } catch (error) { throw new Error(`${name}: ${error.message}`,{cause:error}); }
    }
    const ids = ['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
    for (const id of ids) await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${id}@test.invalid`]);
    const asUser = async id => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
      await db.exec('set role authenticated');
    };
    const scalar = async (sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0];
    await asUser(ids[0]);
    const source = await scalar('select public.ensure_personal_workspace()');
    assert.equal(await scalar('select public.ensure_personal_workspace()'),source);
    await asUser(ids[1]);
    const target = await scalar('select public.ensure_personal_workspace()');
    const code = await scalar('select public.create_personal_invite()');
    assert.equal(code.length,6);
    await asUser(ids[2]);
    await scalar('select public.ensure_personal_workspace()');
    await assert.rejects(db.query('select * from public.personal_join_tickets'),/permission denied/);
    for (let i=0;i<6;i++) assert.equal(await scalar("select public.prepare_personal_join('BADBAD')"),null);
    assert.equal(await scalar('select public.prepare_personal_join($1)',[code]),null);

    await asUser(ids[0]);
    for (const name of ['Мои книги','Мой спорт']) await db.query("select public.manage_date_category($1,'add',null,$2)",[source,name]);
    await assert.rejects(db.query("select public.manage_date_category($1,'add',null,'Седьмая')",[source]),/6 категорий/);
    const photo = `${source}/${ids[0]}/photo.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)",[photo]);
    const wish = await scalar("insert into public.wishes(couple_id,list,title,photos,fulfilled) values($1,'creator','Моё желание',array[$2],true) returning id",[source,photo]);
    const sharedWish = await scalar("insert into public.wishes(couple_id,list,title) values($1,'together','Общее желание') returning id",[source]);
    await db.query("insert into public.wish_comments(couple_id,wish_id,body) values($1,$2,'Комментарий')",[source,wish]);
    const event = await scalar("insert into public.date_events(couple_id,title,event_date,category) values($1,'Моя дата',current_date,'important') returning id",[source]);
    await db.query('select public.set_date_completion($1,current_date,true)',[event]);
    const note = await scalar("select (public.save_shared_note($1,null,0,'text','Запись','Текст','[]',true,false)).id",[source]);
    await db.query("select public.save_shared_note($1,$2,1,'text','Запись','Текст','[]',true,true)",[source,note]);
    await asUser(ids[1]);
    for (const name of ['Его книги','Его спорт']) await db.query("select public.manage_date_category($1,'add',null,$2)",[target,name]);
    const targetEvent = await scalar("insert into public.date_events(couple_id,title,event_date,category) values($1,'Его дата',current_date,'important') returning id",[target]);
    const targetWish = await scalar("insert into public.wishes(couple_id,list,title) values($1,'creator','Его желание') returning id",[target]);
    await asUser(ids[0]);
    let preview = await scalar('select public.prepare_personal_join($1)',[code]);
    assert.equal(preview.categories.length,12);
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(preview.categories)]),/не больше 6/);
    assert.equal(await scalar('select count(*)::int from public.date_events'),1,'failed join is atomic');
    const plan = preview.categories.map(x=>({...x,label:x.label.replace(/^(Мои|Его) книги$/,'Книги').replace(/^(Мой|Его) спорт$/,'Спорт')}));
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(plan.slice(1))]),/все категории/);
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,false)',[preview.token,JSON.stringify(plan)]),/Подтвердите/);
    await asUser(ids[2]);
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(plan)]),/истекло/);
    await asUser(ids[0]);
    await db.exec('reset role');
    await db.query("update public.date_categories set label='Другое название' where couple_id=$1 and value='important'",[target]);
    await asUser(ids[0]);
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(plan)]),/Категории изменились/);
    await db.exec('reset role');
    await db.query("update public.date_categories set label='Важные даты' where couple_id=$1 and value='important'",[target]);
    const jobsBefore = await scalar('select count(*)::int from public.wish_jobs');
    // Fail late, after categories/events were moved: the whole merge must roll back.
    await db.query('delete from storage.objects where name=$1',[photo]);
    await asUser(ids[0]);
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(plan)]),/Недоступная фотография/);
    assert.equal(await scalar('select public.ensure_personal_workspace()'),source);
    assert.equal(await scalar('select count(*)::int from public.date_categories'),6);
    assert.equal(await scalar('select count(*)::int from public.date_events'),1);
    await db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)",[photo]);
    await db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(plan)]);
    await assert.rejects(db.query('select public.join_personal_workspace($1,$2,true)',[preview.token,JSON.stringify(plan)]),/истекло/);
    await db.exec('reset role');
    assert.equal(await scalar('select count(*)::int from public.wish_jobs'),jobsBefore,'merge must not spam notifications');
    await asUser(ids[0]);
    assert.equal(await scalar('select public.ensure_personal_workspace()'),target);
    assert.equal(await scalar('select count(*)::int from public.date_categories'),6);
    assert.equal(await scalar('select count(*)::int from public.date_events'),2);
    assert.equal(await scalar('select count(*)::int from public.wishes'),3);
    assert.equal(await scalar('select list from public.wishes where id=$1',[wish]),'partner');
    assert.equal(await scalar('select list from public.wishes where id=$1',[sharedWish]),'together');
    assert.equal(await scalar('select list from public.wishes where id=$1',[targetWish]),'creator');
    assert.equal(await scalar('select count(*)::int from public.wish_comments'),1);
    assert.equal(await scalar('select count(*)::int from public.date_completions'),1);
    assert.equal(await scalar('select deleted_at is not null and version=3 and pinned from public.notes where id=$1',[note]),true);
    assert.equal(await scalar('select count(*)::int from storage.objects where name=$1',[photo]),1);
    await db.query("update public.wishes set title='Новое имя' where id=$1",[wish]);
    await asUser(ids[1]);
    assert.equal(await scalar('select count(*)::int from storage.objects where name=$1',[photo]),1);
    await db.query("update public.wishes set description='После объединения' where id=$1",[wish]);
    await assert.rejects(db.query("select public.manage_date_category($1,'add',null,'Седьмая')",[target]),/6 категорий/);
    await asUser(ids[2]);
    assert.equal(await scalar('select count(*)::int from storage.objects where name=$1',[photo]),0);
    assert.equal(await scalar('select count(*)::int from public.wishes where id=$1',[wish]),0);
    await db.exec('reset role');
    assert.equal(await scalar('select count(*)::int from public.date_events where id=any($1::uuid[])',[[event,targetEvent]]),2);
    console.log('PASS: all migrations, solo workspaces, 6-category limit, atomic merge, wishes/photos/comments, trash, history, RLS, rate limit');
    await require('./daily-question-scenarios.cjs')(db, ids, target);
  } finally { await db.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
