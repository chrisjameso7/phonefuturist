-- Hosted Supabase may install this platform event trigger in public.
-- It is not an application RPC. Keep its event-trigger behavior, revoke API execution.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
