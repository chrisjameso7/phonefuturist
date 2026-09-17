# Native Studio core — implementation status

The first native editorial slice is implemented: structured drafts, public sources and private notes, immutable revisions, optimistic concurrency, submission, independent approval, MFA-protected publication, audited Admin override, correction notes and withdrawal notices. Public routes and feeds select only the published revision; later draft edits remain private.

## Editor decision

The initial editor is a small React structured-block editor using existing dependencies. Schema version 1 supports paragraphs, headings, quotes, lists and HTTPS links. It stores plain text, never arbitrary HTML. No paid CMS or AI service is involved. A full rich-text editor and validated media workflow remain separate work. Writers must save explicitly; navigating away from unsaved changes triggers a browser warning. Unsaved confidential content is not stored in localStorage.

## Authorization

Writer: create and edit own work. Editor: edit and review; cannot approve any article they created or contributed to. Publisher: publish an approved revision. Admin: all capabilities, with an explicit reason required for emergency publication. Every database command rechecks active account, verified email, role, session and applicable MFA. Direct client access to private editorial tables is denied.

Both user-authorized administrator grants were confirmed in the development database. MFA enrollment/verification and the hosted multi-account acceptance journey still require verification. Do not infer staff readiness from the presence of a role alone.

## Remaining Milestone 1 work

Media upload validation and storage policies, author identities/coauthors, staff promotion controls, scheduling, route redirects, revision comparison/restore UI, RSS/sitemap/SEO and backup/restore drill are not complete. Hosted writer → editor → publisher acceptance remains open. Do not treat this core slice as completion of Milestone 1 or the outstanding Foundation checks.

The user expressly authorized Studio implementation while Foundation evidence was still being gathered. No fabricated article or test content is inserted into the hosted publication. Database tests use a disposable local PGlite database only.
