# Publication and Studio implementation queue

The next product priority is a native writing-to-publication flow. The site is not a finished publication and must not accept irreplaceable production articles before backup/restore acceptance. The accepted Milestone 1 requirements remain the completion standard.

## First working journey

1. An administrator promotes an explicitly identified, verified account to Writer.
2. The writer creates an article using schema-versioned structured content and records supporting sources, keeping confidential notes private.
3. Submission freezes a revision for review. An Editor other than that revision's author requests changes or approves the exact revision.
4. A Publisher with MFA publishes that approved revision atomically to its canonical route. An Admin emergency override requires a reason and immutable audit event.
5. The live page, section feed and homepage show the published revision only. Subsequent edits remain private until reviewed. Material corrections carry a visible note.

## Logical implementation commits

- Editorial schema, private sourcing, author identities and revision-specific authorization, with direct database negative tests.
- Studio article list and structured editor; draft save, conflict detection and submission.
- Review feedback, approval, publication and audited emergency override; staff promotion controls.
- Public article rendering, actual homepage/section stories, canonical routes, redirects and author pages.
- Media validation/storage permissions, scheduling/cancellation/retry behavior, corrections and withdrawal notices.
- RSS/sitemap/SEO, database/media backup and restore drill, hosted end-to-end acceptance.

The editor should be a modest open-source structured editor with no paid backend. Public readers do not load Studio/editor bundles. Final editor dependency selection must be documented and validated against Workers before adoption.

## Current prerequisite

The intended administrator account is verified and active, but the connector's data queries are read-only. The project owner must run the reviewed bootstrap SQL in Supabase SQL Editor and enroll/verify TOTP through the app. This is an external access-control boundary, not a missing app role to work around. Remaining Foundation acceptance checks stay open until verified.

The user requested that work on the full site begin; the immediate deliverable is this newsroom journey. Community/intelligence and the immersive, brand-neutral device lab follow the accepted roadmap, not fabricated placeholder activity.
