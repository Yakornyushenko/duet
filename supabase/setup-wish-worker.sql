-- Run after the wishlist migrations. Enable pg_cron and pg_net in Supabase first.
-- In Vault create secrets:
--   wish_worker_url = https://YOUR_PROJECT.supabase.co/functions/v1/process-wish-jobs
--   wish_worker_secret = the same random secret as Edge Function WISH_WORKER_SECRET
-- Never put that secret in the mobile app.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'wish_worker_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'wish_worker_secret') then
    raise exception 'Create wish_worker_url and wish_worker_secret in Vault first';
  end if;
end $$;

select cron.schedule('duet-wish-notifications', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'wish_worker_url'),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-wish-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'wish_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
