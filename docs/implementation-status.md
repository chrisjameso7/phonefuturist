# Milestone 0 — Foundation

Status: In progress. Implementation authorized; acceptance is not yet complete.

The Final Architecture Review and ADR-001 through ADR-011 are accepted. The roadmap is approved. Historical planning documents preserve their original text; this status document records the subsequent approval and supersedes their implementation pause.

Scope: Foundation only. No articles, forum, predictions, intelligence, or simulation features are being implemented.

Hosted development is deployed on Cloudflare and configured for the Supabase project `ehldokmrgahrlcoyidjy`. The user reports Google OAuth, email confirmation, minimum password length and TOTP configured. Provider setup is not a substitute for completing the end-to-end acceptance checks. No paid services are authorized.

## Implemented for review

- Astro/React/TypeScript shell and Cloudflare Workers configuration, pinned dependencies and lockfile.
- Server-mediated email/password and Google authentication routes, confirmation/recovery flow, protected account/Studio entry and TOTP enrollment/verification.
- Fail-closed configuration, origin checks, bounded form parsing, private-response caching restrictions and security headers.
- Versioned PostgreSQL account/role/profile migration with RLS, restricted caller-scoped access functions and session/restriction/MFA checks. No future domain tables or fabricated content.
- CI validation workflow, security/bootstrap documentation and exact external setup checklist.

## Verification evidence

- Astro check: 24 files, zero errors, warnings or hints.
- Vitest: all 10 security and PostgreSQL authorization tests passed. Windows required the native config loader and thread pool.
- Dependency installation succeeded with lifecycle scripts disabled; this is not a substitute for clean CI installation.
- Local production build is unverified: the Windows environment rejected an esbuild subprocess with `spawn EPERM`.
- GitHub Actions subsequently passed clean `npm ci` and the full `npm run verify` (type checks, tests and production build) on Linux for commit `6a8d31d6ccda1a429cccfe2e764533fe8c331361`: [successful run](https://github.com/chrisjameso7/phonefuturist/actions/runs/35168040566). The initial run caught a truncated lockfile transfer; its repair is committed separately.
- Hosted authentication, real Supabase migration replay, browser checks and Cloudflare deployment remain unverified.

## Blocking work before acceptance

Supabase access is now available. Applied Foundation to the empty application schemas on the intended hosted project. Verified all four tables have RLS, anonymous callers cannot execute foundation_access, and authenticated callers cannot insert role grants or profiles. All 10 local PostgreSQL/security tests pass after migration alignment. The connector's query role cannot impersonate authenticated users or execute the restricted access RPC, so hosted user-session checks still require an actual sign-in; no privileges were expanded to work around this.

Security review found a pre-existing public platform event-trigger function with client EXECUTE permissions. A second migration revokes those unnecessary grants, preserving the trigger. Advisor findings now consist of intentional deny-all private-table policy notices and the provider's disabled leaked-password protection warning. Review [password protection availability](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) within the free-plan constraint; no paid upgrade or reduction of password requirements is authorized.

The migration files were originally created by the CLI and subsequently renamed to the actual versions assigned by hosted apply_migration: `20260917132534` and `20260917132641`. Git and hosted history now share the same versions, avoiding a duplicate replay on db push. No application data or administrator role was fabricated.

The latest live check still returned the old no-referrer policy and old homepage. The committed origin-policy fix and editorial redesign require build/deployment from an environment that permits the build subprocesses. Administrator identity/bootstrap, hosted MFA, email delivery/recovery, browser/mobile checks and runtime-budget validation remain pending. Studio publication functionality is not yet implemented.

Provide the user-controlled configuration listed in [setup](setup.md). Then replay the migration against real Supabase and complete the hosted acceptance checklist. The user now authorizes automatic advancement after each milestone passes its acceptance checks. Milestone 0 has not passed yet. External setup and changes to accepted architecture still require user input.
