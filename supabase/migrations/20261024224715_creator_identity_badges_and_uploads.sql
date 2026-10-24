-- A public badge is derived from private grants. Clients cannot write this column.
alter table public.creator_profiles add column verification_badge text
  check (verification_badge in ('gold','green'));
revoke insert, update on public.creator_profiles from authenticated;
grant insert (user_id,handle,display_name,bio,avatar_url),
      update (user_id,handle,display_name,bio,avatar_url)
  on public.creator_profiles to authenticated;

create function private.set_creator_badge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.verification_badge := (
    select case
      when exists(select 1 from private.role_grants r where r.user_id=new.user_id and r.role='admin') then 'gold'
      when exists(select 1 from private.role_grants r where r.user_id=new.user_id and r.role in ('writer','editor','publisher','moderator')) then 'green'
      else null end
    from private.accounts a join auth.users u on u.id=a.user_id
    where a.user_id=new.user_id and a.status='active' and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until < now())
  );
  return new;
end;
$$;
revoke all on function private.set_creator_badge() from public,anon,authenticated;
create trigger derive_creator_verification before insert or update on public.creator_profiles
for each row execute function private.set_creator_badge();

create function private.refresh_creator_badge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    update public.creator_profiles set verification_badge=null where user_id=old.user_id;
  end if;
  if tg_op <> 'DELETE' then
    update public.creator_profiles set verification_badge=null where user_id=new.user_id;
  end if;
  return null;
end;
$$;
revoke all on function private.refresh_creator_badge() from public,anon,authenticated;
create trigger refresh_creator_role_badge after insert or update or delete on private.role_grants
for each row execute function private.refresh_creator_badge();
create trigger refresh_creator_status_badge after update of status on private.accounts
for each row execute function private.refresh_creator_badge();

create function private.refresh_creator_auth_badge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.creator_profiles set verification_badge=null where user_id=new.id;
  return null;
end;
$$;
revoke all on function private.refresh_creator_auth_badge() from public,anon,authenticated;
create trigger refresh_creator_auth_badge after update of email_confirmed_at,banned_until on auth.users
for each row execute function private.refresh_creator_auth_badge();
update public.creator_profiles set verification_badge=null;

-- Unique object names avoid overwrite races. Public avatar URLs, private bucket listing.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-images','profile-images',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']);
create policy creator_photo_insert on storage.objects for insert to authenticated
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean);
create policy creator_photo_insert_boundary on storage.objects as restrictive for insert to authenticated
with check (bucket_id<>'profile-images' or ((storage.foldername(name))[1]=(select auth.uid())::text
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean));
create policy creator_photo_read on storage.objects for select to authenticated
using(bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy creator_photo_read_boundary on storage.objects as restrictive for select to public
using(bucket_id<>'profile-images' or (storage.foldername(name))[1]=(select auth.uid())::text);
create policy creator_photo_delete on storage.objects for delete to authenticated
using(bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and ((select private.current_access())->>'active')::boolean);
create policy creator_photo_delete_boundary on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'profile-images' or ((storage.foldername(name))[1]=(select auth.uid())::text
  and ((select private.current_access())->>'active')::boolean));
create policy creator_photo_no_overwrite on storage.objects as restrictive for update to authenticated
using(bucket_id<>'profile-images') with check(bucket_id<>'profile-images');
