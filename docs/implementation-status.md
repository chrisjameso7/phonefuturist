# PhoneFuturist implementation status

17 September 2026. Foundation acceptance remains open. The user subsequently authorized native Studio implementation and supplied the frontend concept. This branch includes that first editorial slice without declaring Milestone 1 complete.

## Implemented

- Astro/React/TypeScript on Cloudflare Workers with Supabase Auth and PostgreSQL.
- Verified-account and applicable MFA checks, caller-scoped roles, bounded requests and exact-origin protection.
- Native Studio drafts, structured sourcing, private research notes, revision-specific independent review, publication, correction notes and audited withdrawals/overrides.
- Public article routes, section-filtered feeds, homepage publication grid, dark conceptual-device hero and account workspace based on the supplied design.
- Versioned editorial history: live content remains unchanged while later drafts are edited.

## Evidence

15 local tests passed, including database permission and publishing workflow cases. TypeScript passed. GitHub Actions run [35260253434](https://github.com/chrisjameso7/phonefuturist/actions/runs/35260253434) passed clean installation and full Astro check, tests and Workers production build at commit 27ec889a. Hosted Foundation and Studio migrations are applied; no hosted stories were seeded. Hosted metadata confirms RLS and no direct client table access on all three editorial tables, anonymous Studio execution denied, and anonymous publication reads permitted.

The development Worker exists at https://phonefuturist-dev.phonefuturist.workers.dev. The sign-in origin-policy fix was previously deployed. This new Studio/frontend release still needs deployment from the owner terminal because agent-side Wrangler/esbuild subprocess creation is denied (spawn EPERM). No hosted browser verification of this release is claimed.

## Remaining acceptance

Hosted writer → editor → publisher testing, MFA/email/recovery checks, media storage, backups/restore, runtime budget and other roadmap acceptance remain open. Both explicitly authorized administrator grants were confirmed; no MFA requirement was removed.

The Supabase advisor reports intentional deny-all private-table RLS notices and the existing [disabled leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No paid plan was enabled. Connector SQL can inspect permissions but cannot impersonate users or call restricted publication RPCs; client permissions were not expanded for testing.

See [Studio delivery](studio-delivery.md) for remaining Milestone 1 work and [frontend decisions](frontend-concept.md). Community, predictions, device intelligence and deterministic simulations remain subsequent milestones. The user authorized automatic advancement only after acceptance checks pass; external setup and architectural changes still require input.

