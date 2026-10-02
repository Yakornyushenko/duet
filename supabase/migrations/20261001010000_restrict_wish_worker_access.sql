begin;

-- Supabase may grant EXECUTE directly to API roles. Revoking PUBLIC alone
-- does not remove those grants. Only the server worker may claim queue jobs.
revoke all privileges on function public.claim_wish_jobs() from public, anon, authenticated;
grant execute on function public.claim_wish_jobs() to service_role;

-- Roll back if inherited permissions still expose the function to clients.
do $$
begin
  if has_function_privilege('anon', 'public.claim_wish_jobs()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.claim_wish_jobs()', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.claim_wish_jobs()', 'EXECUTE') then
    raise exception 'Unexpected wish worker function permissions';
  end if;
end;
$$;

commit;
