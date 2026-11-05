# Team directory and newsletter setup

## Team directory

Review and approve `supabase/migrations/20261104073910_studio_team_directory.sql` before applying it to the linked project. It adds a team table, admin-only management policies, published-only public reads, validation/versioning and a public-safe article lookup. It does not grant account roles or change existing account data.

After migration and deployment, an administrator opens **Account → Manage our team** or `/studio/team`. Add a profile, optionally link its existing author account, and publish it. Drafts remain private. Published profiles appear on About and `/team/{slug}`. Articles match original account authorship, not names. Uploaded team photos use the existing public avatars bucket; removing a team record does not delete its linked account, articles or uploaded file.

## Newsletter

Set `RESEND_API_KEY` as a Cloudflare Worker secret (never commit it). Configure `NEWSLETTER_FROM` with a verified sender and `NEWSLETTER_SEGMENT_ID` with the intended Resend segment. Until all three exist, signup stays disabled.

Signup sends a confirmation email; it does not add a contact immediately. The recipient must open the signed link and press Confirm. Links expire after 24 hours. Confirmation adds the contact to the configured segment. No campaign-sending interface is included in this change. Configure unsubscribe handling in outgoing campaigns before sending newsletters.

## Verification limits

Local database tests verify team access policies and safe public article results. Browser checks use synthetic users and a local provider fixture. Production team reads and image uploads must be checked after the approved migration. Resend delivery must be checked after credentials and sender settings are installed; no live messages were sent during development.
