The following decisions are approved as the initial PhoneFuturist product and architecture policy.

## 1. Frontend and Deployment

Approve:

**Astro + React + TypeScript deployed on Cloudflare Workers.**

Use Astro primarily for public editorial and intelligence pages where performance, SEO, and minimal client JavaScript matter.

Use React islands/app experiences for highly interactive areas such as:

- PhoneFuturist Studio
- Forum interactions
- Predictions
- Interactive Leaks
- Account/profile controls
- Notifications

Avoid turning the entire publication into a client-rendered React application unnecessarily.

Supabase remains the backend.

---

## 2. Release Definition

Use two release definitions.

### Public Beta

PhoneFuturist may publicly launch once these are production-ready:

- Homepage/publication
- News and article pages
- PhoneFuturist Studio
- Writer/editor workflow
- Accounts
- Profiles
- Forum/community
- Basic moderation
- Predictions
- Basic device intelligence
- Basic rumor/claim/source relationships
- SEO fundamentals

Interactive Leaks does not need to block the first public release.

### PhoneFuturist V1

V1 is considered complete when Interactive Leaks is also operational with at least one defensible deterministic simulation model.

Do not delay the publication/community launch waiting for the complete simulation platform.

---

## 3. Identity

Initial public authentication:

- Email/password
- Google sign-in

Do not add additional social providers initially unless implementation is essentially free and trivial.

Public users may self-register.

Staff accounts must be explicitly invited or promoted by an administrator. A normal registered user must never be able to self-assign a staff role.

Email verification should be required for actions that create public content.

Staff should have MFA available from the beginning. Require MFA for Admin and Publisher roles before production launch if the chosen authentication implementation supports this cleanly without introducing paid infrastructure.

Do not make the application dependent on a paid transactional email provider during the initial build. Use the capabilities available within the approved free infrastructure where practical.

---

## 4. Editorial Authority

Roles:

- Writer
- Editor
- Publisher
- Admin

A person may hold more than one staff capability if the authorization model benefits from capability-based permissions internally.

Writers cannot publish.

Editors can review, edit, approve, and request revisions.

Publishers can publish, schedule, withdraw, and manage publication state.

Admins manage the platform and may also possess editorial capabilities.

### Self-approval

A writer should not approve their own submitted article merely because they also possess Editor capability.

For normal newsroom operation, another qualified staff member should review original reporting before publication.

However, Admin should have an emergency override because PhoneFuturist may initially operate with a very small team.

Emergency/override publication must be explicitly recorded in the audit history.

Do not architect a workflow that makes publication impossible when the newsroom only has one available senior staff member.

### Corrections

Published articles may receive:

- Minor edits
- Updates
- Material corrections

Material factual corrections require a visible correction/update note.

### Withdrawal

Published articles should generally not be hard-deleted.

If an article must be withdrawn, preserve the internal historical record and normally keep the canonical URL with a withdrawal notice where legally and editorially appropriate.

---

## 5. Historical Integrity

Adopt strong historical preservation.

### Citations

Citations/sources used to support published claims should be associated with the relevant article revision or claim state where practical.

### Rumors and assessments

Important rumor/claim assessments should be append-oriented.

New evidence creates a new assessment/state rather than silently rewriting what PhoneFuturist previously believed.

### Simulations

Simulation runs must retain:

- Input snapshot
- Model version
- Assumptions
- Output
- Timestamp

Changing the current simulation model must not silently alter historical simulation results.

### Redaction exceptions

Historical preservation is not absolute.

Authorized administrators may redact information where required for:

- Privacy
- Security
- Legal compliance
- Copyright
- Accidental publication of confidential information
- Serious safety concerns

Redaction actions should themselves be auditable where legally appropriate.

Do not use append-only architecture as an excuse to retain information that must legitimately be removed.

---

## 6. Community

Use a shared discussion foundation where practical.

Forum threads, article discussions, prediction discussions, and Interactive Leak discussions should reuse common discussion/reply/reaction primitives rather than creating four unrelated comment systems.

Their presentation may differ.

### Editing

Users may edit their own posts.

Store edit timestamps.

For meaningful edits after engagement has occurred, architecture should permit retaining revision history.

### Deletion

Users may request/delete their own ordinary content where policy permits.

If replies depend on a deleted post, prefer a tombstone such as "Post deleted" rather than destroying discussion structure.

Moderators can remove content independently.

### Initial categories

Start small:

- Smartphones
- Apple
- Samsung
- Google
- Android
- Processors & Semiconductors
- Laptops & PCs
- Displays & Cameras
- Leaks & Rumors
- Interactive Leaks
- Predictions
- General Technology

Categories must remain configurable.

### Moderation

Admin initially carries moderation authority.

The architecture must support a dedicated Moderator role/capability later without redesigning the authorization system.

---

## 7. Predictions

A publicly submitted prediction becomes historically significant.

After publication, the core prediction claim should be immutable.

If a correction is necessary, preserve the original prediction and record the correction rather than silently replacing it.

A prediction may have a short draft/edit period before final submission.

### Resolution states

- Correct
- Incorrect
- Partially correct
- Invalid / Unresolvable

### Resolution evidence

Every resolved prediction should contain:

- Resolution
- Resolver
- Resolution date
- Supporting evidence/source
- Optional explanation

### Adjudication

Initially, authorized PhoneFuturist staff resolve predictions.

Prediction authors cannot resolve their own prediction unless acting through an explicit administrative override, which must be logged.

Disputed resolutions should be capable of being reopened by authorized staff.

Do not implement community voting as the final authority on factual resolution.

---

## 8. Interactive Leak Simulation

The first simulation model should be:

**Battery Endurance / Energy Model.**

Reason:

Battery behavior connects several major rumored specifications:

- Battery capacity
- SoC efficiency
- Display characteristics
- Refresh rate
- Brightness
- Connectivity
- Workload

It is understandable to readers and can be calibrated against released devices.

Do not begin with an attempt to simulate the entire smartphone.

The first model should support defined workloads/scenarios rather than claiming a universal battery-life number.

Examples may eventually include:

- Light use
- Mixed use
- Video playback
- Browsing
- Gaming/heavy use

Results should be expressed as estimates/ranges with assumptions clearly visible.

### Calibration evidence

Use released devices with known specifications and credible real-world battery testing as calibration references.

Document which evidence is used.

Do not scrape or reproduce proprietary test datasets without appropriate permission.

### Acceptable claim

PhoneFuturist may say:

"Based on the currently reported specifications and PhoneFuturist's battery model, this configuration is estimated to..."

PhoneFuturist must not say:

"This unreleased device will achieve..."

Simulation output is an estimate, not leaked information.

### Methodology ownership

PhoneFuturist owns the methodology as a product/editorial system.

Assign a named internal methodology owner before the simulation is publicly described as a PhoneFuturist model.

Until a larger technical team exists, Admin/Product Lead may serve as methodology owner.

Model changes must be versioned and documented.

---

## 9. Operations

### Spending ceiling

Initial recurring infrastructure target:

**$0.**

No paid service may be introduced without explicit approval.

If usage outgrows free infrastructure, report the constraint and proposed cost before changing services.

### Backups

Use Supabase/platform-provided capabilities where available initially.

Before meaningful production content accumulates, establish an independent periodic PostgreSQL backup/export procedure.

The backup destination must not rely exclusively on the same production database instance.

Prefer a zero-cost secure destination initially.

### Data-loss window

Initial target:

**Maximum acceptable data loss: 24 hours.**

Editorial content and core production data should eventually receive stronger protection as the publication grows.

### Recovery target

Initial target:

**Restore core publication functionality within 24 hours of a serious recoverable infrastructure failure.**

These are early-stage targets, not enterprise SLAs.

### Scheduling tolerance

Scheduled editorial publication does not require second-level precision.

A tolerance of approximately **5 minutes** is acceptable for the initial platform.

Breaking/manual publication should publish immediately after authorized action.

---

## 10. Routes and Content Format

Adopt stable canonical URLs from the beginning.

Preferred public routes:

- `/news/[slug]`
- `/reports/[slug]`
- `/leaks/[slug]`
- `/analysis/[slug]`
- `/interactive/[slug]`
- `/devices/[slug]`
- `/predictions/[slug-or-id]`
- `/forum/[category]/[thread]`
- `/author/[username]`
- `/user/[username]`
- `/studio`

Published article URLs should remain stable even if an article's headline changes.

Use immutable internal IDs independent of slugs.

Slug changes after publication should create redirects where appropriate.

### Article storage

Do not store editorial articles as raw HTML as the canonical source.

Use structured rich-text content with a defined schema.

The format should support at minimum:

- Paragraphs
- Headings
- Lists
- Links
- Quotes
- Images
- Captions
- Embeds where approved

Rendering must sanitize untrusted content.

The structured format should be versionable so future editor capabilities can be added without invalidating old articles.

Do not adopt an excessively complex block editor framework before the actual editorial requirements justify it.

---

These decisions should now be treated as initial product policy.

Before coding:

1. Convert significant architectural decisions into ADRs where appropriate.
2. Identify any remaining decision that genuinely blocks Milestone 0.
3. Produce the final proposed milestone plan and acceptance criteria.
4. Identify any part of these decisions that conflicts with Supabase, Astro, Cloudflare Workers, the $0 infrastructure target, or the previously approved Master Specification.

Do not begin implementation until this final architecture review is approved.