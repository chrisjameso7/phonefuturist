# Creator identity rollout

Apply the CLI-created `creator_identity_badges_and_uploads` migration to the canonical PhoneFuturist Supabase project (`ehldokmrgahrlcoyidjy`) before deploying the application commit. Do not apply it to ÉLAN. Inspect the hosted tables and existing storage policies first, then run security advisors after application.

The migration adds a public, read-only `verification_badge` projection to the existing public creator profile table. Triggers derive gold from Admin grants and green from Writer, Editor, Publisher or Moderator grants. Admin takes priority. Changes to trusted grants, account status and email confirmation/bans refresh the projection automatically. Existing profiles are backfilled. Clients retain writes to profile identity fields but cannot write badge values. No roles are granted by this migration, and blue badges are not enabled.

The `profile-images` public bucket is limited to 10 MB JPEG, PNG, WebP and AVIF images. Authenticated, active, email-confirmed users can upload only under their own user ID folder. Restrictive policies protect this boundary even if broader legacy policies exist. Objects cannot be overwritten, and listings/deletes are limited to the owner's folder. Public avatar delivery is intentional. The application also validates file signatures and bounds request sizes.

Verify after migration:

```sql
select handle, verification_badge from public.creator_profiles;
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='profile-images';
select policyname, cmd, permissive from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'creator_photo_%';
select has_column_privilege('authenticated','public.creator_profiles','verification_badge','UPDATE') as can_forge_badge;
```

`can_forge_badge` must be false. Test signed-in homepage controls, new-profile redirect, existing-profile view/edit, real image upload and cross-account upload rejection before declaring the hosted rollout complete. No Supabase secret or service-role key is required in the browser or Worker; authenticated uploads use the existing user-scoped client.
