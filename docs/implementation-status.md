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

The development Worker exists at https://phonefuturist-dev.phonefuturist.workers.dev. The sign-in origin-policy fix was previously deployed. Full-access authorization removed the subprocess blocker. The Studio/frontend release is deployed as Cloudflare version 1230c0d5-4ef5-4239-b507-989408280795. Browser checks verified the live homepage, loaded hero image, mobile menu and anonymous Studio redirect. Empty same-origin login POST returns 303 validation; foreign/null origins return 403. Authenticated multi-account acceptance remains open.

## Remaining acceptance

Hosted writer → editor → publisher testing, MFA/email/recovery checks, media storage, backups/restore, runtime budget and other roadmap acceptance remain open. Both explicitly authorized administrator grants were confirmed; no MFA requirement was removed.

The Supabase advisor reports intentional deny-all private-table RLS notices and the existing [disabled leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No paid plan was enabled. Connector SQL can inspect permissions but cannot impersonate users or call restricted publication RPCs; client permissions were not expanded for testing.

See [Studio delivery](studio-delivery.md) for remaining Milestone 1 work and [frontend decisions](frontend-concept.md). Community, predictions, device intelligence and deterministic simulations remain subsequent milestones. The user authorized automatic advancement only after acceptance checks pass; external setup and architectural changes still require input.



18 September: OneDrive is the approved independent encrypted backup destination. Local export/encryption/recovery/status tools are implemented; public-certificate pinning, ciphertext-only sync writes, integrity verification and plaintext hash checks are tested. No real backup, encryption key, export credential, schedule or recovery guarantee has been provisioned. PostgreSQL clients and privately entered export/recovery setup are required. See [backup/restore](backup-restore.md). All 17 tests pass locally.

## 18 September 2026 — current delivery priorities

Session-aware header and Admin-only public Studio navigation are deployed (5433310). The Studio list alias failure was fixed and verified. Twenty-one tests passed before the new MFA work. Foundation and Publication acceptance remain open; the site is not complete.

1. Finish authenticated acceptance: new writer, correction request, independent editor approval, publisher/Admin publication, email recovery and session persistence. Apply the explicitly approved Admin exception policy and verify grants separately; see admin-mfa-exceptions.md.
2. Complete Publication/Studio: validated image uploads and storage policies, author/coauthor identities, staff invitation/promotion, editorial feedback and history UI, scheduling, canonical redirects, SEO/RSS/sitemap, mobile/accessibility checks.
3. Community: profiles, article discussions/forum, replies/reactions, reports/moderation and notifications.
4. Intelligence: devices/components, source-backed claims, rumor histories and article links with historical provenance.
5. Predictions: locked propositions, evidence-backed resolution and public histories.
6. Interactive Leaks: calibrated, versioned deterministic models, custom device/scenario inputs and reproducible saved runs. No fabricated benchmark measurements or LLM-generated numerical results.

Launch operations remain outstanding: real encrypted OneDrive backup, isolated restore drill, email delivery configuration/verification, runtime/quota checks and the full AI-free acceptance journey. No paid service was enabled. Backup tools existing in the repository do not constitute an operational backup.
