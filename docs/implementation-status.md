# Milestone 0 — Foundation

Status: In progress. Implementation authorized; acceptance is not yet complete.

The Final Architecture Review and ADR-001 through ADR-011 are accepted. The roadmap is approved. Historical planning documents preserve their original text; this status document records the subsequent approval and supersedes their implementation pause.

Scope: Foundation only. No articles, forum, predictions, intelligence, or simulation features are being implemented.

Hosted acceptance requires a Supabase project, SMTP, Google OAuth, and Cloudflare configuration. The connected Supabase account returned no projects during initial inspection. No paid services are authorized.

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

The earlier automatic approval usage block cleared. Supabase initialization succeeded and the CLI generated `20260917010106_foundation_identity.sql`; all 10 tests passed against that migration. Local configuration requires email confirmation, 12-character passwords and TOTP, with explicit API grants and no seed content. No hosted database was modified. Real Supabase replay is still blocked: no accessible hosted project and no local Docker installation.

Provide the user-controlled configuration listed in [setup](setup.md). Then replay the migration against real Supabase and complete the hosted acceptance checklist. The user now authorizes automatic advancement after each milestone passes its acceptance checks. Milestone 0 has not passed yet. External setup and changes to accepted architecture still require user input.
