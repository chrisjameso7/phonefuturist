-- Read-only directory for verified Studio authors. No emails or new author roles.
create function private.studio_authors()
returns table(user_id uuid, display_name text, handle text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not (private.has_capability('writer') or private.has_capability('editor') or private.has_capability('publisher') or private.has_capability('admin')) then
  raise exception 'STUDIO_FORBIDDEN' using errcode='42501';
 end if;
 return query
 select c.user_id,c.display_name,c.handle
 from public.creator_profiles c
 join private.accounts a on a.user_id=c.user_id
 join auth.users u on u.id=c.user_id
 where a.status='active' and u.email_confirmed_at is not null
  and (u.banned_until is null or u.banned_until<now())
  and exists(select 1 from private.role_grants r where r.user_id=c.user_id and r.role in ('writer','editor','publisher','admin'))
 order by c.display_name,c.user_id;
end;
$$;
revoke all on function private.studio_authors() from public,anon,authenticated;
grant execute on function private.studio_authors() to authenticated;
create function public.studio_authors()
returns table(user_id uuid,display_name text,handle text)
language sql stable security invoker set search_path='' as $$ select * from private.studio_authors(); $$;
revoke all on function public.studio_authors() from public,anon,authenticated;
grant execute on function public.studio_authors() to authenticated;
