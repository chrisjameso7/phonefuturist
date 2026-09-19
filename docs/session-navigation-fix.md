# Session-aware navigation and Studio list repair

18 September 2026. The user reported that the signed-in header still showed Sign in, that Studio appeared in public navigation, and that the newsroom list failed to load.

The header was static. Middleware now resolves an existing Supabase session on public pages as well as private pages, using Auth getUser and the server-owned foundation_access result. Cookie presence is only an optimization hint, not authorization. Guests see Sign in/Get started; signed-in users see My account/Sign out. Studio is absent from public homepage calls to action and appears in the global navigation only for active, verified administrators. Existing private Writer/Editor/Publisher access is preserved for the approved editorial workflow. No role or MFA check was weakened. Session-personalized responses remain private/no-store and vary by Cookie.

The Studio list bug was reproduced in disposable PostgreSQL: column reference a.id was ambiguous because a PL/pgSQL row variable and SQL table alias used the same name. The list alias is now listed. New regressions cover an empty admin list, own-writer list and exclusion of another writer. The original tests exercised detail reads but missed list reads. The fix is a new migration; historical SQL is not rewritten. CLI-generated version was reconciled to hosted applied version 20260918031640.

Verification: 21 tests passed, Astro check reported zero errors/warnings and the Workers production build passed. Hosted metadata confirms the repaired function and unchanged anonymous execution denial. Live signed-in account verification still requires an actual authenticated browser session; no session was forged and no production fixture was inserted.
