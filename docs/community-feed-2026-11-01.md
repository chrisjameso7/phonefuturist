# Community release — 2026-11-01

Community now provides a build-focused feed with captions, likes, replies, private forks, optional 3D previews, follows and public follower/following counts. Accounts show suggested admins and writers; following is always voluntary. Creator search remains available.

Sharing is explicit: publishing a saved private build makes it public atomically with its post. The studio, device concept tools and simulation sharing expose a small Community action. Existing calculations, renderer controls, authentication, navigation and unrelated pages remain unchanged except compact follower counts on account/creator headers.

The isolated migration adds community_posts, community_replies, community_likes and community_follows, bounded read/publish functions and posting limits. All four tables use RLS. Writes derive identity from the active session, require existing verified active-account rules, and prevent impersonation. Private build content remains protected. Existing policies, secrets and production settings were not changed.

Verification: Astro check passed (567 files, zero errors/warnings/hints); focused API/database tests passed (13 tests). Local browser fixtures verified posting, likes, replies, following, count updates, draft preservation, private copies and lazy 3D preview. Widths 360, 390, 430 and 768px had no horizontal overflow. These fixtures created no production activity. Live Supabase security advisors reported no error-level issues; RLS is enabled on all four tables.

Full suite, production build and deployment results will be recorded below. Real-account authenticated production acceptance remains a user check; no production credentials were requested or fabricated. Existing large simulation/Three.js bundle warnings remain outside this scoped change. Beta labels remain.
