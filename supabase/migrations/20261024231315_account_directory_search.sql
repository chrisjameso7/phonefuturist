-- Account emails are visible only to the existing primary administrator.
create function private.studio_account_search(p_query text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare term text := lower(trim(coalesce(p_query,'')));
begin
 if auth.uid() is null or not private.has_capability('admin') or not exists(select 1 from private.access_policy where primary_admin=auth.uid()) then
  raise exception 'STUDIO_FORBIDDEN' using errcode='42501';
 end if;
 if length(term)<2 or length(term)>80 then return '[]'::jsonb; end if;
 term := ltrim(term,'@');
 return coalesce((select jsonb_agg(result order by result.email) from (
  select u.email,c.handle,c.display_name,c.avatar_url,c.verification_badge,
   u.email_confirmed_at is not null as verified,a.status,
   coalesce((select jsonb_agg(r.role order by r.role) from private.role_grants r where r.user_id=u.id),'[]'::jsonb) as roles
  from auth.users u join private.accounts a on a.user_id=u.id
  left join public.creator_profiles c on c.user_id=u.id
  where strpos(lower(coalesce(u.email,'')),term)>0 or strpos(lower(coalesce(c.handle,'')),term)>0 or strpos(lower(coalesce(c.display_name,'')),term)>0
  order by u.email limit 25
 ) result),'[]'::jsonb);
end;
$$;
revoke all on function private.studio_account_search(text) from public,anon,authenticated;
grant execute on function private.studio_account_search(text) to authenticated;
create function public.studio_account_search(p_query text) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.studio_account_search(p_query); $$;
revoke all on function public.studio_account_search(text) from public,anon,authenticated;
grant execute on function public.studio_account_search(text) to authenticated;
