-- Read-only regression check; never call claim_wish_jobs on the live queue.
begin read only;
do $$
begin
  if has_function_privilege('anon', 'public.claim_wish_jobs()', 'EXECUTE') then
    raise exception 'Anonymous callers can claim wish jobs';
  end if;
  if has_function_privilege('authenticated', 'public.claim_wish_jobs()', 'EXECUTE') then
    raise exception 'Signed-in clients can claim wish jobs';
  end if;
  if not has_function_privilege('service_role', 'public.claim_wish_jobs()', 'EXECUTE') then
    raise exception 'Server worker cannot claim wish jobs';
  end if;
end;
$$;
select
  has_function_privilege('anon', 'public.claim_wish_jobs()', 'EXECUTE') as anonymous_access,
  has_function_privilege('authenticated', 'public.claim_wish_jobs()', 'EXECUTE') as user_access,
  has_function_privilege('service_role', 'public.claim_wish_jobs()', 'EXECUTE') as worker_access;
rollback;
