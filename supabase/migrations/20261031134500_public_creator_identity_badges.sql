-- Preserve all identity keys, indexes, RLS policies and existing public URLs.
-- Validate only new/changed handles; legacy 21–24 character handles remain readable/editable.
create function private.validate_creator_handle() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' or new.handle is distinct from old.handle then
  if new.handle !~ '^[a-z0-9_]{3,20}$' then raise exception 'Use 3–20 characters: only lowercase letters, numbers, and underscores are permitted.' using errcode='23514'; end if;
 end if; return new;
end; $$;
create trigger creator_handle_validation before insert or update of handle on public.creator_profiles for each row execute function private.validate_creator_handle();
create function private.validate_profile_username() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' or new.username is distinct from old.username then
  if new.username is not null and new.username !~ '^[a-z0-9_]{3,20}$' then raise exception 'Use 3–20 characters: only lowercase letters, numbers, and underscores are permitted.' using errcode='23514'; end if;
 end if; return new;
end; $$;
create trigger profile_username_validation before insert or update of username on public.profiles for each row execute function private.validate_profile_username();
-- Role badges continue to use the existing protected verification_badge derivation.
-- Public creator SELECT policy and unique handle index are intentionally unchanged.
