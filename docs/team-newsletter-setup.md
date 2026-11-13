# Team directory and newsletter setup

## Team directory

Review and approve `supabase/migrations/20261104073910_studio_team_directory.sql` before applying it to the linked project. It adds a team table, admin-only management policies, published-only public reads, validation/versioning and a public-safe article lookup. It does not grant account roles or change existing account data.

After migration and deployment, an administrator opens **Account → Manage our team** or `/studio/team`. Add a profile, optionally link its existing author account, and publish it. Drafts remain private. Published profiles appear on About and `/team/{slug}`. Articles match original account authorship, not names. Uploaded team photos use the existing public avatars bucket; removing a team record does not delete its linked account, articles or uploaded file.

## Newsletter

The current workflow and existing Worker-variable names are documented in [newsletter.md](newsletter.md). Signup now directly registers a consented contact with the configured segment and explicit topic opt-in, without sending confirmation mail. The older signed confirmation route remains available for previously issued links.
