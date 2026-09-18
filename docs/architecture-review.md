# PhoneFuturist — Final Architecture Review and ADR Register

Date: 2026-09-16

Repository of record: `chrisjameso7/phonefuturist`.

Status: Documentation only. Accepted policies below reflect the user's explicit decisions. The milestone decomposition and implementation interpretations remain proposed until this final review is approved. No application implementation is authorized by this document.

## Authority and scope

The governing inputs are the Master Product Specification v1.0 and the subsequent approved initial product and architecture policy. The later policy controls where it refines the master specification or supersedes earlier assistant proposals.

In particular, Public Beta includes predictions, the forum, and basic intelligence. Interactive Leaks completes V1 but does not block Public Beta. The approved category-based article routes replace the earlier `/articles/[slug]` proposal. Supabase/PostgreSQL is accepted and is not being reconsidered.

This file is a review artifact prepared for the canonical repository. It has not been committed or pushed to GitHub. ADR identifiers below are proposed repository identifiers; their Accepted status records the user's policy approval, not implementation completion.

## Accepted architecture decision records

### ADR-001 — Supabase/PostgreSQL backend

**Status:** Accepted.

**Context:** PhoneFuturist is a fresh implementation with relational editorial, provenance, community, prediction, and simulation data.

**Decision:** Use Supabase/PostgreSQL as the default backend, with Supabase Auth and Storage and selective use of Realtime and backend capabilities. Enforce referential integrity, ownership, and access through database constraints, grants, RLS, and controlled operations. Do not introduce another database without a demonstrated requirement.

**Consequences:** SQL migrations, access policies, and transaction tests are first-class development work. A separate CMS, search service, authentication subscription, or general backend service is not required by this decision.

**Reconsideration:** Only an actually encountered, documented reconsideration trigger or genuine implementation blocker may reopen the accepted backend choice. Hypothetical preferences and speculative scale are insufficient. Cost limits should first be evaluated as operating constraints, not automatic reasons to replace the backend.

### ADR-002 — Astro, React, TypeScript, and Cloudflare Workers

**Status:** Accepted.

**Context:** Editorial readability, SEO, and limited JavaScript must coexist with rich application experiences.

**Decision:** Astro owns the public page and routing structure; React supplies interactive islands/app experiences for Studio, community, predictions, accounts, notifications, and simulations. Deploy to Cloudflare Workers. Supabase remains the backend. Studio is part of the same application at `/studio`.

**Consequences:** Reading public journalism must not load editor or simulation bundles. The application has one coherent design system. Workers runtime compatibility and free-tier CPU consumption require representative validation in Milestone 0. No paid hosting or image-processing dependency is authorized.

### ADR-003 — Shared identity and privileged access

**Status:** Accepted.

**Context:** Readers and staff use one account throughout PhoneFuturist, but registration must never confer staff privileges.

**Decision:** Begin with email/password and Google sign-in. Public registration is allowed. Administrators explicitly invite or promote staff. Require verified email for actions creating public content. Keep authentication identity separate from username/display name and public profile data. Provide staff MFA from the beginning; require it for Admin and Publisher before production if supported cleanly without paid infrastructure.

**Consequences:** Email verification and recovery delivery are public-launch dependencies. User-editable metadata cannot grant privileges. Bans, suspension, role grants, and ownership must be enforced at the backend/database. Moderator capability must be representable even though Admin initially moderates.

**Proposed implementation interpretation:** Use authenticator-app TOTP rather than SMS MFA; enforce elevated assurance on privileged operations and implement a documented recovery process. Confirm plan availability and enrollment/recovery behavior in Milestone 0. An editorial emergency override does not bypass identity or MFA controls.

### ADR-004 — Revision-specific editorial authority

**Status:** Accepted.

**Context:** Writers, reviewers, publishers, and administrators may overlap in a small newsroom, while accountability must remain explicit.

**Decision:** Writers create and submit; Editors review, edit, approve, and request revisions; Publishers publish, schedule, withdraw, and manage publication state. Admin manages the platform and may hold editorial capabilities. Normal self-approval is prohibited. Explicit Admin emergency publication overrides are allowed and must be audited.

**Consequences:** Approval references an exact publication revision. Changes to its content or substantive publication metadata require another approval. A live revision remains unchanged while a replacement is reviewed. Material factual corrections have visible notes. Withdrawn articles normally retain a canonical notice and internal history where appropriate.

**Proposed implementation interpretation:** Every override requires a reason and records actor, revision, timestamp, and bypassed normal step. It still enforces content validation, authorization, and audit recording. Use atomic, retry-safe publication operations with concurrency checks. Scheduling pins an approved revision rather than a mutable draft.

### ADR-005 — Provenance, history, and controlled redaction

**Status:** Accepted.

**Context:** Current truth must not silently replace what PhoneFuturist previously reported, assessed, predicted, or modeled.

**Decision:** Preserve published revisions and relevant citation states. Append meaningful claim/rumor assessments. Preserve prediction claims and resolution history. Freeze simulation inputs, assumptions, model version, output, and timestamp. Permit authorized redaction for privacy, security, legal compliance, copyright, confidentiality, and serious safety concerns; audit removal where appropriate.

**Consequences:** Current-state pointers are conveniences, not sole historical records. Source identity, source material, and a citation's evidentiary use remain distinguishable. Public provenance never requires exposing confidential identities. Redaction applies to historical views and derived public copies as well as current pages.

**Proposed implementation interpretation:** Store both external publication/event times and PhoneFuturist recording times. Preserve source-derivation links and uncertainty about independent corroboration. Do not build a full event-sourcing framework. A redaction procedure must consider citations, quotations, search, caches, assets, simulations, exports, and backup retention without copying removed secrets into audit messages.

### ADR-006 — Shared discussion foundation

**Status:** Accepted.

**Context:** Forum, article, prediction, and Interactive Leak conversations need one identity and consistent moderation.

**Decision:** Reuse discussion, post/reply, and reaction primitives with contextual presentation. Permit user edits under policy, retain edit timestamps, and support meaningful revision history after engagement. Prefer tombstones when deletion would break replies. Administrators initially moderate; a dedicated Moderator capability can follow.

**Initial configurable categories:** Smartphones; Apple; Samsung; Google; Android; Processors & Semiconductors; Laptops & PCs; Displays & Cameras; Leaks & Rumors; Interactive Leaks; Predictions; General Technology.

**Consequences:** One reporting, locking, removal, suspension, and audit system serves all discussion contexts. Seed the approved categories without fabricating activity; homepage promotion can remain selective. Notifications are in-app initially.

### ADR-007 — Immutable public predictions and evidence-based resolution

**Status:** Accepted.

**Context:** Public prediction records are meaningless if claims or unfavorable outcomes can be silently rewritten.

**Decision:** Drafts can be edited before final submission. The public core claim then becomes immutable. Corrections retain the original. Authorized staff resolve predictions as Correct, Incorrect, Partially correct, or Invalid/Unresolvable, with resolver, time, supporting evidence, and optional explanation. Authors cannot resolve their own predictions except through a logged administrative override. Authorized staff may reopen disputes; community voting is not factual authority.

**Consequences:** Resolution records and reopening history must survive subsequent adjudication. A deadline alone is not evidence of an incorrect outcome. Public profiles show factual histories rather than elaborate reputation scores.

**Proposed implementation interpretation:** Lock subject/variant scope, deadline/event, and resolution criteria with the claim. Require partial-outcome criteria where that verdict is possible. Explain administrative overrides and changed verdicts even though ordinary resolution explanations are optional.

### ADR-008 — Versioned battery-endurance simulation

**Status:** Accepted.

**Context:** Interactive Leaks should explore consequences of uncertain specifications without implying measurement of unreleased hardware.

**Decision:** Start with a deterministic Battery Endurance/Energy Model for defined workloads. Show estimates/ranges, assumptions, and input provenance. Use credible released-device evidence within its permitted use. Assign a named methodology owner before describing it publicly as a PhoneFuturist model. Version and document changes. LLMs do not generate numerical outputs.

**Consequences:** Initial scope is a supported subset of workloads and inputs, not a universal smartphone simulator. A model must document equations, units, coefficient origins, calibration, limitations, and valid ranges. Historical runs remain fixed after model or rumor updates.

**Proposed implementation interpretation:** Keep calculation code independent of UI/database, reuse it for server verification of shared runs, retain old executable versions and fixtures, and distinguish user overrides from reported inputs. Model identity includes coefficient/configuration versions, not only a code label. Methodology owner may initially be the named Admin/Product Lead.

### ADR-009 — Zero-cost operations and recovery targets

**Status:** Accepted.

**Context:** Initial infrastructure must remain within a $0 recurring spending target, without pretending that free services offer enterprise guarantees.

**Decision:** No paid service without explicit approval. Use available platform facilities and establish independent periodic PostgreSQL exports before meaningful production content accumulates. Target a maximum 24-hour data-loss window and restoration of core publication functionality within 24 hours of a serious recoverable failure. Scheduled publication may be approximately five minutes late; authorized manual publication proceeds immediately in normal service operation.

**Consequences:** Export storage cannot depend exclusively on the production database. Complete recovery also needs Storage objects and documented environment/auth configuration. Actual quota exhaustion, delivery failures, and restore limits must be reported rather than concealed through paid upgrades. These targets do not imply an SLA during provider-wide outages.

**Proposed implementation interpretation:** Schedule exports more frequently than every 24 hours, track the age of the last successful restorable backup, and provide a failure-response procedure. A once-daily job without failure handling does not reliably meet a 24-hour maximum. Independently store encrypted backups with separately recoverable keys. Select an actual free destination and prove restoration before production data depends on it.

### ADR-010 — Canonical URLs and structured article content

**Status:** Accepted.

**Context:** Recognizable editorial URLs and evolving content must preserve links and historical rendering.

**Decision:** Use `/news/[slug]`, `/reports/[slug]`, `/leaks/[slug]`, `/analysis/[slug]`, `/interactive/[slug]`, `/devices/[slug]`, `/predictions/[slug-or-id]`, `/forum/[category]/[thread]`, `/author/[username]`, `/user/[username]`, and `/studio`. Internal immutable IDs are independent of slugs. Headline edits do not change a published URL. Deliberate slug changes produce redirects where appropriate. Store schema-versioned structured rich text, not raw HTML, with safe rendering and approved embeds.

**Consequences:** Resolve routes through stored canonical paths and aliases, not by recomputing a slug from the current headline. Article and forum content retain immutable identities across path changes. Published revisions remain renderable after editor upgrades.

**Proposed implementation interpretation:** Freeze an article's initial section/path at publication even if its editorial classification later changes. If staff deliberately move it, retain an alias/redirect. Category moves for forum threads likewise preserve redirects. Prevent alias collisions and redirect chains. Select a modest open-source editor during Foundation; do not introduce a paid editor backend.

### ADR-011 — Release boundaries and AI independence

**Status:** Accepted.

**Context:** Publication/community must launch before the entire simulation platform is complete, without calling an incomplete product V1.

**Decision:** Public Beta includes publication, Studio, workflow, accounts/profiles, forum/community, moderation, predictions, basic device/rumor/claim/source relationships, and SEO. Completed V1 additionally includes at least one defensible deterministic Interactive Leak. Every essential feature operates without AI. Research assistance comes later and never publishes automatically.

**Consequences:** Public Beta follows Predictions in the proposed sequence below. Neither disabled AI nor absent AI credentials may break the acceptance journey. GitHub remains canonical; milestones use logical commits and documented decisions and leave deployable states.

## Remaining decisions and prerequisites

### What genuinely blocks starting Milestone 0?

Only approval of this final architecture review currently blocks authorization to implement. No additional product decision or backend comparison is needed before beginning Foundation. The outstanding items below must be resolved at their relevant gates; they must not be silently treated as already configured or validated.

| Item | Required by | Proposed handling |
| --- | --- | --- |
| Supabase and Cloudflare project/account access | Hosted Foundation verification | Inspect authorized connections when implementation begins; configure free resources only. |
| Google OAuth application and redirect configuration | Foundation authentication acceptance | Configure development/staging/production redirects separately; verify consent/branding requirements and safe account linking. |
| SMTP delivery and verified sending identity | Hosted email-auth acceptance; absolutely before public onboarding | Select/configure a suitable free SMTP allowance. No paid fallback and no disabling verification to mask delivery failure. Local mail testing can support early development only. |
| Existing domain or approved sender domain access | Branded email and production custom domain | Use existing ownership if available. A new paid domain is not implicitly authorized. Provider subdomains can support early deployment, not necessarily email sender verification. |
| First Admin and MFA recovery custodian | Privileged workflow acceptance | Controlled one-time bootstrap outside public registration; document lost-factor recovery and prevent routine bypass. |
| Independent backup destination and recovery keys | Before meaningful production content | Confirm a secure free destination, permissions, retention, scheduling, and restoration before relying on it. |
| Detailed community/redaction retention rules | Public Beta | Implement the approved edit/tombstone/override policies; document retention and redaction behavior before collecting public contributions. |
| Named methodology owner and permitted calibration evidence | Milestone 5 public model gate | Admin/Product Lead may serve; establish actual evidence and validation rather than illustrative coefficients. |

Runtime/library compatibility, editor selection, image handling, and caching are bounded engineering validations within Milestone 0, not reasons to repeatedly reopen approved product policy.

## Compatibility and constraint review

### No fundamental platform conflict found

The approved architecture is compatible in principle: Astro supports Workers deployment; Supabase provides PostgreSQL, Auth, Storage, MFA APIs, and scheduling primitives. Actual free-plan fit and end-to-end behavior still require implementation measurements. Policy approval is not proof of deployment success.

### Email is the clearest launch dependency

Supabase's built-in SMTP is restricted to project-team recipients, heavily rate-limited, and not intended for production. Public email/password registration, verification, recovery, and invitations cannot rely on it. A free custom SMTP allowance could meet the policy, but a provider, sender identity, quotas, and delivery tests are not yet selected. This is not permission to add a paid email service. Google sign-in is not a replacement for the approved email/password route. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

### MFA requires enforcement and recovery, not just enrollment UI

Supabase supports authenticator-app TOTP and assurance-level enforcement. Proposed approach: require elevated assurance for Admin/Publisher operations, including overrides. Validate free-plan availability, factor removal, session behavior, and recovery during Foundation. Do not introduce SMS costs or assume a Google login automatically establishes Supabase MFA assurance. [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)

### Workers Free has a material CPU constraint

Current documentation lists a 10 ms CPU budget per HTTP request and 100,000 requests/day. CPU is distinct from database/network wait time. Profile representative SSR/auth/content requests early. Keep editorial pages lean, bound parsing and rendering, and avoid image decoding or heavy simulation work in ordinary page requests. Caching does not remove the need to validate uncached requests. Do not silently switch to a paid plan if measurements fail. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

### Image processing must not introduce a hidden paid dependency

Do not assume automatic paid image transformations are free because the frontend adapter supports them. Begin with constrained raster uploads and bounded public image sizes; client preparation helps performance but does not replace backend validation. Validate a free processing path before promising automatic responsive variants. If necessary, use approved pre-sized editorial assets while retaining secure uploads and document the limitation. Reject unsupported formats rather than running unsafe or unbounded decoders.

### Free plans do not guarantee scheduling or recovery targets

Supabase lists inactivity pausing and bounded free resources; paid backup features cannot be assumed available. The five-minute scheduling target applies under normal service operation and should be tested with an idempotent database scheduler. Show late/failed schedules, preserve due work across interruptions, and provide an authenticated recovery procedure. Do not claim a 24-hour recovery target is proven until a restore drill succeeds. [Supabase pricing](https://supabase.com/pricing), [Supabase Cron](https://supabase.com/docs/guides/cron)

### Database backup is not complete application backup

Supabase database backups omit Storage file contents. Export media independently and retain the configuration/recovery instructions needed to rebuild the application. Protect backup secrets and do not commit production exports to GitHub. Redaction retention rules apply to backups too. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups)

### Refinements versus earlier proposals

- Public Beta now includes Predictions; an earlier suggested release after Intelligence alone is superseded.
- Approved section-based article routes replace `/articles/[slug]`; canonical paths and redirects resolve the reclassification tension.
- The approved twelve categories are retained; their homepage visibility need not be equal.
- Admin overrides are explicit, audited exceptions to ordinary separation of duties, not accidental permission leaks.
- Redaction is an intentional exception to retention, not a reason to disable history globally.
- Ordinary prediction resolution explanations remain optional; evidence, resolver, date, and outcome remain mandatory.
- Scheduled publication remains in the publication milestone and is not deferred.

## Final proposed milestone plan

The order is Foundation → Publication → Community → Intelligence → Predictions → Public Beta → Interactive Leaks → V1. This intentionally moves Intelligence before Predictions while preserving all approved Beta scope.

### Milestone 0 — Foundation

**Deliverables:** One Astro/React/TypeScript application, Workers deployment, Supabase integration, migrations, generated/validated types, auth/session foundations, email/password and Google flows, verification restrictions, role/status foundations, staff MFA, initial design tokens/components, error states, environment documentation, and GitHub checks.

**Acceptance:**

- A clean checkout can run, validate, and deploy using documented configuration; secrets never enter Git or client bundles.
- Signup, verification, login, logout, recovery, Google callback, and authenticated rendering work in a hosted test environment. Local email simulation alone does not count as hosted delivery acceptance.
- Readers cannot grant roles; unverified users cannot create public content; suspended/banned users are rejected through direct API calls.
- Admin bootstrap is controlled; TOTP enrollment/challenge and required privileged assurance work, with a documented recovery procedure.
- Exposed data access is deny-by-default where appropriate, with grants and RLS tested independently of route visibility.
- Representative public SSR and auth requests fit the free Workers runtime; no paid image service is activated.
- Migrations replay in a clean database; preview configuration is isolated from production; no production data is used as a fixture.
- Public layouts and core controls pass keyboard/mobile checks. No fake journalism is published.

### Milestone 1 — Publication and Studio

**Deliverables:** Staff invitation/promotion, sourced articles, authors/co-authors, categories, structured editor, revisions, editorial feedback, approval, immediate/scheduled publication, corrections, withdrawals, media, feeds, canonical routes/redirects, SEO/RSS/sitemap.

**Acceptance:**

- A new invited writer submits a sourced article, receives a correction request, revises, and obtains approval from another qualified staff member; Publisher publishes that exact revision.
- Writers cannot publish through direct API calls. Editing an approved payload cannot silently publish unreviewed changes.
- Logged Admin override works for a one-person newsroom without bypassing authentication, MFA, or structural validation.
- Scheduled jobs publish once within approximately five minutes in normal operation; retries, cancellation, late-job recovery, and concurrent edits behave correctly.
- Manual publication makes content publicly available without waiting for the scheduled job. Private cache/session data never leaks into public pages.
- Corrections preserve previous revisions and display material notes; withdrawal keeps an appropriate notice; headline edits preserve URLs and intentional path moves redirect.
- Sources/private notes remain correctly separated; unauthorized media access fails.
- Database-and-media backup procedure and a publication restore drill are completed before meaningful production content accumulates.

### Milestone 2 — Community

**Deliverables:** Profiles, shared discussions, the approved configurable categories, threads/posts/replies/quotes, reactions, permalinks, pagination, edit histories/timestamps, tombstones, reporting, moderation, locks, bans/suspensions, and basic in-app notifications.

**Acceptance:**

- One verified account can discuss an article and participate in the forum without another registration.
- Users cannot edit other users' content, bypass locks/bans, or forge moderator actions through direct API access.
- Meaningful edits after engagement retain the appropriate history; deletion preserves reply structure; quoting does not silently adopt later text edits.
- Administrators can process reports with reason codes and audit history; moderator capability is separable from editorial sourcing access.
- Notifications are recipient-private, bounded, and retry-safe; forums remain usable on mobile and keyboard.

### Milestone 3 — Intelligence and Provenance

**Deliverables:** Canonical companies/families/devices/variants/components, source material and derivation, typed claims, evidence, assessments, rumor histories, device/rumor pages, article relationships, and public search expansion.

**Acceptance:**

- Staff link a published article to a canonical device and structured rumor without database-console work.
- Conflicting values and later confirmation preserve earlier assertions, citations, assessment dates, authorship, and reasons.
- Repeated reporting is not counted as independent corroboration automatically; confidential identities remain private.
- Information class, assessment/resolution, and confidence remain distinct in data and presentation.
- Regional variants and uncertain dates can be represented without inventing a global release date.
- Redaction removes affected public/derived exposure while recording an appropriate non-sensitive event.

### Milestone 4 — Predictions

**Deliverables:** Drafts, final submission/locking, canonical subjects, resolution criteria/event/deadline, shared discussion, staff adjudication, evidence, reopened decisions, and user prediction histories.

**Acceptance:**

- A public prediction's core proposition, scope, and criteria cannot be silently changed. Corrections preserve the original.
- Every resolution records outcome, resolver, date, and evidence; expired deadlines do not automatically create false verdicts.
- Self-resolution is denied except through an explicit audited Admin override; reopened disputes preserve past verdicts.
- Public histories remain accurate without reputation scoring or community-vote adjudication.

### Public Beta gate — after Milestone 4

Homepage/publication, Studio workflow, accounts/profiles, forum/community, moderation, predictions, basic device intelligence/provenance, and SEO must all be production-ready. Interactive Leaks is not required at this gate.

**Acceptance:** Run the complete writer → correction → approval → publication → reader account → discussion → device/rumor → prediction journey with every AI feature absent/disabled. Recheck authorization, verified email, privileged MFA, responsive accessibility, published metadata, cache behavior, and error states. Verify independent backups, measured restore procedure, quota visibility, and accountable moderation. No paid service may be enabled without explicit approval.

### Milestone 5 — Interactive Leaks and completed V1

**Deliverables:** One battery energy/endurance model, defined supported workloads, model/scenario versions, traceable rumor inputs, assumptions, uncertainty/sensitivity ranges, bounded comparison, saved verified runs, methodology page, and common discussion integration.

**Acceptance:**

- A named methodology owner approves documented equations, coefficient sources, permitted calibration evidence, limitations, and release criteria.
- A reader follows journalism to a rumor/device and an Interactive Leak; reported inputs and custom assumptions are distinguishable.
- Known-device calibration and boundary/unit/reproducibility tests pass the documented model criteria. Do not invent a quantitative error threshold without assessing the evidence.
- Saved runs preserve input snapshots, versioned assumptions, outputs, timestamps, and relevant provenance; updated rumors/models do not change historical results.
- Server verification rejects altered outputs and unsupported inputs. Old model versions remain reproducible unless a documented redaction exception prevents it.
- Mobile, keyboard, and readable chart alternatives work. Model estimates are never presented as measured benchmarks or certain future performance.
- The full Master Specification success journey, including evidence-based claim/prediction resolution and historical preservation, passes without AI. V1 is then complete.

### Milestone 6 — Optional research assistance

Only after the core product works: research queues, source-discovery assistance, duplicate/contradiction assistance, and optional AI. No automatic publication, no unapproved paid API, and no essential dependency on this milestone. Provider/model selection is intentionally not settled now.

## Common completion rules

- Every major milestone has a deployable build and logical GitHub commits, with versioned migrations and current setup documentation.
- Test security and history through backend interfaces, not only UI flows. Test simulation behavior against meaningful fixtures and calibration evidence.
- Keep normal page payloads lean; enforce pagination and upload/input bounds; hide incomplete features from ordinary users.
- Use additive/compatible migrations where practical; validate rollback and restoration plans before risky changes.
- Document discovered limits and proposed costs before changing scope or paid services.
- Do not repeatedly reopen accepted architecture absent an actual trigger.

## Review conclusion

No unresolved product architecture choice currently prevents beginning Milestone 0 after approval. Email delivery, account access, free-runtime validation, and bootstrap/recovery setup are Foundation acceptance prerequisites. Backups and operational readiness gate meaningful production use; methodology ownership and calibration gate the public simulation.

No application code, infrastructure, credentials, database changes, or GitHub mutations were created as part of this review. Approval of this final review is still required before implementation begins.
