# PHONEFUTURIST
## Master Product Specification v1.0

**Status:** Governing product specification  
**Implementation:** Fresh build  
**Repository:** `chrisjameso7/phonefuturist`  
**Preferred backend:** Supabase / PostgreSQL  
**Current objective:** Architecture planning only. Do not begin coding until the architecture and milestone plan are approved.

---

# 1. PRODUCT VISION

PhoneFuturist is a professional technology publication, intelligence platform, and enthusiast community focused primarily on upcoming and unreleased consumer technology.

Its core coverage includes:

- Smartphones
- Tablets
- Laptops
- Processors
- GPUs
- Displays
- Camera systems and sensors
- Batteries and charging
- Operating systems
- Wearables
- Consumer electronics
- Semiconductor technology
- Relevant technology companies and supply chains

PhoneFuturist must not become another generic technology blog.

The platform combines:

**Journalism + Leaks + Structured Rumor Intelligence + Predictions + Community + Interactive Technical Analysis**

The central product loop is:

```text
REPORTING
    ↓
SOURCES
    ↓
CLAIMS
    ↓
RUMORS
    ↓
DEVICES / COMPONENTS
    ↓
INTERACTIVE SIMULATIONS
    ↓
COMMUNITY DISCUSSION
    ↓
REAL PRODUCT LAUNCH
    ↓
RESOLUTION / ACCURACY HISTORY
```

Information should become more useful as it moves through PhoneFuturist rather than simply becoming another article.

---

# 2. CORE PRODUCT PRINCIPLES

## 2.1 No fabricated journalism

PhoneFuturist must never generate fake news, fake leaks, fake sources, fake quotations, fake benchmarks, or fabricated specifications simply to populate the website.

The platform may eventually use AI to assist research, extraction, organization, summarization, source comparison, and editorial workflows.

AI must not be the authority deciding what is true.

Human writers and editors remain responsible for publication.

---

## 2.2 AI independence

Every essential PhoneFuturist feature must remain functional if all AI functionality is disabled.

This includes:

- Reading articles
- Publishing
- Editorial workflow
- Accounts
- Forum
- Predictions
- Device intelligence
- Rumor browsing
- Sources
- Interactive Leaks
- Simulations
- Moderation fundamentals

AI is an enhancement layer, not infrastructure required for the product to function.

---

# 3. INFORMATION CLASSES

PhoneFuturist must clearly distinguish different kinds of information.

Never visually or semantically blur these categories.

### CONFIRMED

Information established through official documentation or sufficiently authoritative evidence.

### REPORTED

Information attributed to identifiable reporting but not necessarily officially confirmed.

### RUMORED / LEAKED

Unconfirmed information concerning an unreleased product or development.

### PREDICTION

A claim made about something that may happen in the future.

Predictions may originate from PhoneFuturist staff or community members.

### ESTIMATE / SIMULATION

A calculated output produced from assumptions and structured inputs.

A simulation result is not a leak.

### SPECULATION

Reasoned discussion without sufficient evidence to classify something as reported information.

Every relevant interface must make the information class understandable.

---

# 4. PROVENANCE

Provenance is a first-class product requirement.

PhoneFuturist should be capable of answering:

- Where did this claim originate?
- When was it first reported?
- Who reported it?
- Which sources independently corroborated it?
- Which articles referenced it?
- Has the claim changed?
- Which simulations used it?
- What assumptions were used?
- Was the claim eventually confirmed or disproven?

Do not silently rewrite historical information.

Example:

```text
BATTERY RUMOR HISTORY

October
5,500 mAh reported

December
5,700 mAh reported

February
5,800 mAh reported

April
5,800 mAh officially confirmed
```

The latest state may be prominently displayed, but historical states must remain recoverable.

---

# 5. PUBLIC INFORMATION ARCHITECTURE

The public website should eventually include:

- Home
- News
- Reports
- Leaks
- Interactive Leaks
- Predictions
- Forum
- Devices
- Search
- Article pages
- Device pages
- Author profiles
- User profiles

Do not assume every page needs to ship in the first milestone.

---

# 6. HOME PAGE

The homepage should immediately communicate that PhoneFuturist is both a publication and an intelligence platform.

Potential sections include:

### Lead Story

The most important current story.

### Latest

Chronological recent reporting.

### Reports & Exclusives

Original PhoneFuturist reporting.

### Trending

Stories receiving significant reader attention.

### Latest Leaks

Important current rumors and leaked information.

### Interactive Leaks

Prominent entry point into device simulations.

### Predictions

Interesting active predictions from staff/community.

### Discussions

Active forum conversations.

### Upcoming Devices

Products currently generating significant reporting or rumor activity.

Avoid overwhelming the homepage.

Editorial hierarchy matters more than displaying every feature simultaneously.

---

# 7. EDITORIAL CONTENT TYPES

Support structured editorial classifications.

## NEWS

Straight reporting about developments.

## REPORT

Original PhoneFuturist reporting or investigation.

## LEAK

Reporting involving unreleased information.

## RUMOR

Reporting concerning an unconfirmed claim.

## ANALYSIS

Technical or editorial analysis.

## EXCLUSIVE

Original information PhoneFuturist believes it is first to report.

This label must only be applied deliberately by authorized editorial staff.

## BRIEF

Short-form news update.

## INTERACTIVE

Editorial content directly associated with an Interactive Leak or simulation.

The system should allow future types without major schema redesign.

---

# 8. ARTICLE EXPERIENCE

An article should support:

- Headline
- Subheadline/deck
- Author
- Co-authors if required
- Publication date
- Updated date
- Editorial type
- Category
- Featured image
- Image caption
- Body
- Inline images
- Quotations
- Links
- Embeds where appropriate
- Sources
- Tags
- Related companies
- Related devices
- Related components
- Related claims/rumors
- Related Interactive Leak
- Corrections
- Update notes

The public article page should prioritize readability.

Intelligence metadata should enrich journalism rather than make articles feel like database records.

---

# 9. PHONEFUTURIST STUDIO

Create a private newsroom at:

`/studio`

This is part of the main application.

It is not a separate paid domain or separate product.

PhoneFuturist Studio is where writers and editors manage publication.

---

# 10. STUDIO ROLES

At minimum:

## WRITER

Can:

- Create stories
- Edit own drafts
- Upload editorial media
- Add sources
- Save drafts
- Submit stories
- Receive editorial feedback
- Revise stories
- View own publication history

Cannot publish directly.

## EDITOR

Can:

- Review submitted stories
- Edit stories
- Verify sourcing
- Request revisions
- Approve stories
- Manage relevant metadata

## PUBLISHER

Can:

- Publish
- Schedule
- Unpublish where policy allows
- Manage publication timing

## ADMIN

Full administrative authority.

Can additionally:

- Invite/manage staff
- Assign roles
- Manage editorial configuration
- Manage moderation
- Manage intelligence entities
- Resolve exceptional workflow issues

Permissions must be enforced server-side/database-side where appropriate, not merely hidden in the UI.

---

# 11. EDITORIAL WORKFLOW

Baseline workflow:

```text
DRAFT
  ↓
SUBMITTED
  ↓
IN REVIEW
  ↓
┌─────────────────┐
│                 │
NEEDS REVISION   APPROVED
│                 │
└→ RESUBMITTED    ↓
              SCHEDULED
                  ↓
              PUBLISHED
```

Support:

- Editorial comments
- Revision requests
- Status history
- Approval history
- Scheduling
- Publication
- Update history

Important actions should be attributable to the staff member who performed them.

---

# 12. ARTICLE VERSIONING

Published journalism must preserve historical integrity.

Do not silently replace the historical article state.

The system should support:

- Updated timestamp
- Corrections
- Update notes
- Editorial revision history

Internal version history does not necessarily need to be public.

Material corrections should be capable of being disclosed publicly.

---

# 13. SOURCES

Sources are structured entities, not merely links pasted into article text.

A source may include:

- Name
- URL
- Source category
- Publication/person
- Original author where relevant
- Publication date
- Retrieval date where useful
- Related claim
- Editorial notes
- Reliability metadata

Potential source categories:

- Official company
- Regulatory
- Certification database
- Publication
- Journalist
- Leaker
- Analyst
- Supply-chain source
- Social post
- Forum
- Benchmark database
- Patent
- Research publication
- Other

Do not automatically expose private editorial notes publicly.

---

# 14. SOURCE INDEPENDENCE

Five websites repeating one original claim must not automatically count as five independent confirmations.

The architecture must be capable of representing:

```text
ORIGINAL CLAIM
      ↓
SOURCE A
      ↓
PUBLICATION B
PUBLICATION C
PUBLICATION D
```

rather than treating B, C and D as independent origins.

This will matter for confidence and historical source accuracy.

---

# 15. DEVICE INTELLIGENCE

PhoneFuturist should maintain canonical device entities.

Example conceptual hierarchy:

```text
COMPANY
  ↓
PRODUCT FAMILY
  ↓
DEVICE
  ↓
VARIANT
```

A device may eventually contain:

- Manufacturer
- Product family
- Name
- Codename
- Generation
- Expected announcement
- Expected release
- Actual announcement
- Actual release
- Markets
- Status
- Official specifications
- Reported specifications
- Rumors
- Articles
- Predictions
- Interactive Leak
- Relevant components

Do not duplicate the device name as uncontrolled strings across the database where canonical references are appropriate.

---

# 16. COMPONENT INTELLIGENCE

Components should be reusable entities where useful.

Examples:

- SoCs
- CPU architectures
- GPUs
- Modems
- Display panels
- Camera sensors
- Batteries
- Memory technologies
- Storage technologies
- Charging controllers

A component may be associated with multiple devices and claims.

Do not over-normalize trivial data simply for theoretical database purity.

---

# 17. CLAIMS

A claim represents an assertion about an entity.

Conceptually:

```text
SUBJECT
PROPERTY
VALUE
UNIT
SOURCE
DATE
STATUS
EVIDENCE
```

Example:

```text
Subject:
Galaxy [future device]

Property:
Battery capacity

Value:
5800

Unit:
mAh

Status:
Rumored
```

Claims may support:

- Exact values
- Ranges
- Categorical values
- Textual values
- Multiple possible values

The model must handle uncertainty.

---

# 18. RUMORS

A rumor may aggregate one or more related claims.

Rumors should support:

- Subject
- Property/topic
- Current state
- Historical states
- Supporting claims
- Contradicting claims
- Sources
- Confidence
- First reported
- Last updated
- Resolution
- Evidence

Possible lifecycle:

```text
SPECULATION
↓
RUMORED
↓
REPORTED
↓
LEAKED
↓
CONFIRMED

or

DISPROVEN
```

Do not force every rumor through every state.

---

# 19. CONFIDENCE

Confidence must not be arbitrary decoration.

Do not have an LLM simply output percentages.

The initial implementation may use simple human-assigned classifications such as:

- Low
- Medium
- High

Future algorithmic confidence may consider:

- Historical source accuracy
- Evidence quality
- Independent corroboration
- Specificity
- Recency
- Contradictory evidence
- Official evidence
- Claim history

If percentages are eventually displayed, the methodology should be documented.

Avoid fake mathematical precision.

---

# 20. RUMOR TIMELINES

Device pages should eventually support a historical rumor timeline.

Example:

```text
JAN 04
New battery capacity reported

JAN 17
Second independent source corroborates

FEB 02
Conflicting capacity appears

FEB 20
Regulatory documentation supports original value

MAR 12
Manufacturer confirms specification
```

This should allow users to understand how knowledge evolved.

---

# 21. INTERACTIVE LEAKS

Interactive Leaks is one of PhoneFuturist's defining products.

An Interactive Leak is a configurable virtual representation of an unreleased device built from reported and rumored specifications.

Users should be able to explore:

> "If these rumors are accurate, what might this device behave like?"

It must never imply:

> "This is exactly how the unreleased device performs."

---

# 22. INTERACTIVE LEAK INPUTS

The architecture should eventually support inputs involving:

### Processor

- SoC
- Process node
- CPU architecture
- CPU core configuration
- Clock speeds
- GPU
- Cache
- NPU
- Estimated power characteristics

### Display

- Panel technology
- Size
- Resolution
- Refresh behavior
- LTPO
- Brightness
- Pixel count
- Display area

### Battery

- Capacity
- Voltage where known
- Chemistry
- Charging characteristics

### Memory

- RAM capacity
- RAM technology
- Memory bandwidth where available

### Storage

- Capacity
- Storage technology
- Performance characteristics

### Thermal system

- Cooling architecture
- Vapor chamber
- Graphite
- Device materials
- Surface area
- Thickness

### Camera

- Sensor
- Sensor dimensions
- Resolution
- Aperture
- Lens
- Focal length
- Stabilization

### Connectivity

- Modem
- Cellular configuration
- Wi-Fi
- Bluetooth

### Software

- OS
- Power-management assumptions
- Performance modes

Not every field must exist in V1.

---

# 23. SIMULATION ENGINE

LLMs must not produce numerical simulation results.

The pipeline is:

```text
STRUCTURED INPUTS
      ↓
DETERMINISTIC MODEL
      ↓
CALCULATION
      ↓
ESTIMATE / RANGE
      ↓
ASSUMPTIONS + CONFIDENCE
```

Potential simulation modules include:

- Battery endurance
- Performance
- Sustained performance
- Thermals
- Charging
- Display power
- Gaming workload
- Camera workload

These modules should be independent enough to evolve separately.

---

# 24. SIMULATION UNCERTAINTY

Rumors are uncertain.

Therefore simulations must support uncertainty.

Example:

```text
Battery:
5700-5800 mAh

Processor:
Option A / Option B

Display:
120 Hz LTPO
```

Users may eventually choose:

### MOST LIKELY

PhoneFuturist's current default configuration.

### CUSTOM

User selects assumptions.

### COMPARE

Multiple configurations side by side.

Simulation output should generally prefer sensible ranges over implausibly precise numbers.

---

# 25. REPRODUCIBILITY

A simulation should store enough information to reproduce its result.

A simulation run should eventually preserve:

- Model version
- Input values
- Assumptions
- Date
- Relevant rumor state
- Output
- User configuration where applicable

If the simulation model changes later, an old shared simulation should not silently become a different historical result.

---

# 26. CALIBRATION

Released devices should eventually become calibration references.

Concept:

```text
KNOWN DEVICE
↓
KNOWN SPECS
↓
REAL TEST DATA
↓
PHONEFUTURIST MODEL
↓
ERROR
↓
MODEL IMPROVEMENT
```

PhoneFuturist should eventually be able to evaluate its own simulation accuracy.

Do not claim scientific accuracy before sufficient validation exists.

---

# 27. PREDICTIONS

Predictions are a major community feature.

A prediction is a specific, resolvable future claim.

Example:

> "Device X will launch with a battery larger than 5,500 mAh."

A prediction should support:

- Creator
- Claim
- Subject/device
- Category
- Created date
- Resolution deadline/event
- Evidence
- Discussion
- Status

Possible resolution:

- Correct
- Incorrect
- Partially correct
- Invalid/Unresolvable

Resolution should require evidence.

---

# 28. PREDICTION INTEGRITY

Predictions must not be editable indefinitely.

Otherwise users could rewrite history.

Possible model:

Before lock:
Prediction can be edited.

After lock:
Prediction text is immutable.

If edits before lock occur, meaningful history should be retained where practical.

Once the relevant event occurs, authorized moderation/editorial staff can resolve it using evidence.

---

# 29. PREDICTION TRACK RECORDS

User profiles should eventually show prediction history.

Examples:

- Predictions made
- Resolved predictions
- Correct
- Incorrect
- Partially correct
- Categories predicted

Avoid designing a simplistic reputation score in V1.

Historical records are more important initially than gamification.

---

# 30. FORUM

PhoneFuturist should contain an integrated enthusiast forum.

Users should not need a second account.

Core structure:

```text
CATEGORY
↓
THREAD
↓
POST
↓
REPLY
```

Potential categories may include:

- Smartphones
- Samsung
- Apple
- Google
- Android
- Laptops
- Processors
- Cameras
- Displays
- Interactive Leaks
- Predictions
- General Technology

Categories should be administratively configurable.

---

# 31. FORUM FEATURES

V1 should support the fundamentals:

- Create thread
- Reply
- Quote where appropriate
- Edit own content within policy
- Delete own content where policy allows
- Reactions
- Report content
- Moderation
- Pagination/infinite loading strategy
- Permalinks

Do not attempt to clone every feature of Reddit or Discord.

---

# 32. COMMUNITY ACCOUNTS

One account should work across:

- Forum
- Predictions
- Article discussion
- Interactive Leaks
- Profiles
- Following
- Notifications

Potential profile fields:

- Username
- Display name
- Avatar
- Bio
- Join date
- Forum activity
- Prediction history

Sensitive/private authentication data must never be publicly exposed.

---

# 33. FOLLOWING

Architecture should allow users eventually to follow:

- Other users
- Devices
- Topics
- Predictions
- Forum threads

V1 implementation can be narrower if necessary.

---

# 34. NOTIFICATIONS

Notification architecture should support events such as:

- Reply received
- Mention
- Prediction resolved
- Followed thread updated
- Followed device receives major update
- Editorial feedback for staff

Avoid expensive external notification infrastructure in the initial MVP.

In-app notifications are sufficient initially.

---

# 35. ARTICLE DISCUSSION

Article discussion should integrate with the community identity.

Avoid creating a completely separate comment system unrelated to the forum/community architecture.

Work should determine whether article discussion is best represented as a specialized thread or another shared discussion primitive.

Document the decision.

---

# 36. MODERATION

Moderation is required from the beginning.

Support:

- Report
- Hide/remove
- Lock thread
- User suspension
- User ban
- Moderator notes
- Reason codes
- Audit history for important moderation actions

Permissions must be enforced securely.

Do not build automated AI moderation as a dependency for V1.

---

# 37. SEARCH

Global search should eventually span:

- Articles
- Devices
- Rumors
- Predictions
- Forum threads
- Users
- Components

V1 may begin with PostgreSQL-supported search.

Do not introduce a paid search provider unless actual requirements justify it.

---

# 38. PHONEFUTURIST DESIGN DIRECTION

The website should feel:

- Modern
- Technical
- Editorial
- Premium
- Fast
- Information-dense where appropriate
- Clean rather than sterile
- Distinctive rather than template-like

Avoid:

- Generic SaaS dashboard appearance on public pages
- Excessive glassmorphism
- Excessive gradients
- Giant empty hero sections
- Random animations
- Fake futuristic HUD interfaces
- Neon cyberpunk clichés
- Overcrowded cards
- Every section looking identical

PhoneFuturist should look like a publication that understands technology, not a concept website pretending to be futuristic.

---

# 39. DESIGN SYSTEM

Build a coherent reusable design system.

Define:

- Typography
- Spacing
- Breakpoints
- Radius system
- Surfaces
- Borders
- Semantic colors
- Editorial labels
- Information-status labels
- Buttons
- Inputs
- Cards
- Tables
- Navigation
- Dialogs
- Loading states
- Empty states
- Error states

Dark mode may be an important part of the identity, but accessibility and readability take priority.

---

# 40. RESPONSIVENESS

The entire public product must work properly across:

- Phones
- Tablets
- Laptops
- Desktop displays

The Studio must also remain usable on smaller screens, although complex editorial work may be optimized for larger displays.

Interactive Leaks must not become desktop-only.

---

# 41. ACCESSIBILITY

Follow modern accessibility fundamentals.

Include:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Sufficient contrast
- Accessible forms
- Alternative text support
- Screen-reader-friendly labels
- Reduced-motion consideration

Accessibility should be built into the component system rather than added at the end.

---

# 42. PERFORMANCE

PhoneFuturist is a publication.

Reading an article must not require downloading a giant application bundle.

Architect for:

- Fast article loading
- Efficient images
- Lazy loading
- Pagination
- Efficient database queries
- Appropriate caching
- Minimal unnecessary JavaScript
- Stable layouts

Interactive functionality should not make editorial content unnecessarily heavy.

---

# 43. SEO

Search visibility is strategically important.

Support:

- Server-rendered/indexable public content where appropriate
- Unique titles
- Meta descriptions
- Canonical URLs
- Open Graph metadata
- Social cards
- Article structured data
- Author information
- Publication/update timestamps
- Sitemap
- Robots configuration
- RSS/feeds
- Clean URLs

Potential URL structure:

```text
/news/[slug]
/reports/[slug]
/leaks/[slug]
/interactive/[slug]
/devices/[slug]
/predictions/[id-or-slug]
/forum/[category]/[thread]
/author/[username]
/user/[username]
```

Architecture may refine this.

Avoid URL structures that make future content migrations unnecessarily difficult.

---

# 44. ADVERTISING READINESS

PhoneFuturist should be capable of introducing advertising later without redesigning the entire site.

However:

Do not fill the initial design with fake advertisements.

Reserve sensible opportunities for future advertising without compromising reading experience.

Advertising should never be visually confused with editorial content.

---

# 45. BACKEND

The proposed backend decision is:

**Supabase / PostgreSQL**

Treat this ADR as accepted unless a genuine implementation blocker appears.

Use Supabase where appropriate for:

- PostgreSQL
- Authentication
- Storage
- Realtime
- Server-side/backend capabilities

Do not add another database without a demonstrated requirement.

---

# 46. DATABASE PRINCIPLES

The data model should prioritize:

- Referential integrity
- Provenance
- Historical integrity
- Clear ownership
- Reasonable normalization
- Queryability
- Security
- Future extensibility

Avoid both extremes:

Do not create one giant JSON blob for everything.

Do not create fifty tables where five well-designed tables would suffice.

---

# 47. AUTHENTICATION

Users should support standard secure authentication.

The architecture should permit future authentication methods without major redesign.

Authentication and public profile identity should remain conceptually separate.

Changing a display name must not affect authentication identity.

---

# 48. AUTHORIZATION / RLS

Supabase Row Level Security must be treated as a first-class security boundary.

Examples:

A writer must not be able to publish by manually calling an endpoint.

A banned user must not be able to create posts by bypassing the frontend.

A user must not be able to edit another user's prediction.

Private editorial notes must not leak through public queries.

Administrative actions require appropriate authorization.

Do not rely solely on frontend route protection.

---

# 49. STORAGE

Use storage intentionally.

Potential stored assets:

- Avatars
- Article images
- Featured images
- Editorial media

Do not allow uncontrolled uploads.

Implement:

- File type validation
- File size limits
- Authorization
- Safe naming/storage strategy

Architect with free-tier constraints in mind.

---

# 50. COST CONSTRAINT

The MVP should target **$0 or near-$0 recurring infrastructure cost**.

Do not introduce:

- Paid CMS
- Paid search
- Paid AI APIs
- Paid analytics
- Paid moderation
- Paid image processing
- Paid crawling infrastructure

unless separately approved.

If a requirement cannot reasonably be implemented within free infrastructure, document the tradeoff rather than silently adding a paid dependency.

The goal is not "free forever."

The goal is:

> Do not spend money before actual usage creates a reason to spend money.

---

# 51. ANALYTICS

Do not overbuild analytics in V1.

The architecture should eventually support understanding:

- Article views
- Popular devices
- Interactive Leak usage
- Forum activity
- Prediction activity

Avoid invasive tracking.

A dedicated analytics product can be evaluated later.

---

# 52. ADMINISTRATION

PhoneFuturist requires administrative interfaces for relevant systems.

Eventually:

- Staff
- Articles
- Editorial queue
- Users
- Reports/moderation
- Categories
- Devices
- Components
- Claims
- Rumors
- Sources
- Predictions
- Simulation definitions

Do not put every administration tool into one gigantic dashboard.

Studio should primarily serve editorial staff.

Community/intelligence administration may use appropriate separate sections under the protected administrative experience.

---

# 53. CORRECTIONS

Professional editorial correction behavior is required.

Articles should support:

- Correction notes
- Updated timestamps
- Material update explanations

Do not silently modify major factual errors after publication without preserving appropriate editorial history.

---

# 54. EXCLUSIVES AND LEAKS

"Exclusive" is an editorial claim and must not be automatically generated.

Only authorized editorial roles may apply it.

Leaks must clearly identify their status and sourcing limitations.

Protect confidential/private source information.

Public provenance does not mean exposing confidential source identities.

The architecture should distinguish public source attribution from internal editorial sourcing notes.

---

# 55. PUBLICATION VS COMMUNITY CONTENT

PhoneFuturist editorial content and user-generated content must be visually distinguishable.

A forum post must not look like a PhoneFuturist report.

A community prediction must not look like an editorial leak.

A simulation must not look like confirmed benchmark data.

Brand authority depends on maintaining these distinctions.

---

# 56. SIMULATION VS BENCHMARK

Never label simulated performance as an actual benchmark.

Use language such as:

- Estimated
- Simulated
- Modeled
- Projected range

If real benchmark results become available, clearly distinguish them from modeled results.

---

# 57. ERROR HANDLING

Design proper:

- 404 pages
- Unauthorized states
- Deleted-content states
- Suspended-account states
- Empty feeds
- Failed uploads
- Failed publication
- Network failures
- Simulation errors

Do not leave raw backend errors exposed to users.

---

# 58. DEVELOPMENT QUALITY

This is a fresh implementation.

Prioritize:

- Type safety
- Maintainable structure
- Clear naming
- Reusable components
- Schema migrations
- Validation
- Error handling
- Security
- Tests for critical logic
- Documentation

Do not optimize prematurely.

Do not create unnecessary abstractions merely to appear sophisticated.

---

# 59. VERSION CONTROL

GitHub is the canonical source repository.

Development should occur through logical commits.

Major milestones should leave the application in a deployable state.

Avoid one enormous final commit containing the entire platform.

Architecture decisions with significant long-term consequences should be documented.

---

# 60. ENVIRONMENT CONFIGURATION

Secrets must never be committed.

Use appropriate environment variables.

Provide an example environment configuration containing names but no secrets.

Document required setup.

---

# 61. MVP BOUNDARIES

Do NOT initially build:

- Native iOS app
- Native Android app
- Direct messaging
- Paid subscriptions
- Complex creator monetization
- Automated AI journalism
- Large-scale web crawling
- Proprietary search engine
- Complex recommendation ML
- AI moderation dependency
- Research-grade physics simulator
- Elaborate reputation scoring
- Cryptocurrency/token systems
- Live video
- Full social network functionality

Architecture may permit future expansion without implementing these now.

---

# 62. MVP PRIORITY

The first publicly useful PhoneFuturist version should prove this workflow:

```text
WRITER
↓
CREATES SOURCED ARTICLE
↓
EDITOR REVIEWS
↓
ARTICLE PUBLISHED
↓
READER DISCOVERS ARTICLE
↓
READER CREATES ACCOUNT
↓
READER DISCUSSES IT
↓
RELATED DEVICE/RUMOR CAN BE EXPLORED
```

Then expand the differentiating systems.

---

# 63. DEVELOPMENT MILESTONES

Do not blindly use these exact milestones if architecture review finds a better decomposition, but preserve the dependency logic.

## MILESTONE 0 — FOUNDATION

- Framework
- Supabase
- Database migrations
- Authentication foundation
- Design system
- App shell
- Security baseline
- Development documentation
- Deployment pipeline

## MILESTONE 1 — PUBLICATION + STUDIO

- Articles
- Authors
- Categories
- Sources
- Article editor
- Drafts
- Editorial workflow
- Roles
- Publishing
- Scheduling
- Article pages
- News feeds
- SEO fundamentals

At the end of this milestone, PhoneFuturist should already be capable of functioning as a professional publication.

## MILESTONE 2 — COMMUNITY

- Public accounts
- Profiles
- Forum
- Threads
- Replies
- Reactions
- Reporting
- Moderation
- Basic notifications
- Article discussion

## MILESTONE 3 — PREDICTIONS

- Prediction creation
- Prediction locking
- Discussion
- Resolution
- Evidence
- User prediction histories

## MILESTONE 4 — INTELLIGENCE

- Companies
- Devices
- Components
- Claims
- Sources
- Rumors
- Provenance
- Historical rumor states
- Device pages
- Rumor timelines
- Article relationships

## MILESTONE 5 — INTERACTIVE LEAKS

- Structured configurations
- Simulation model framework
- Deterministic calculation modules
- Assumptions
- Uncertainty
- Scenario comparison
- Reproducible runs
- Shareable Interactive Leaks

Begin with a small number of defensible simulation modules rather than pretending to model everything.

## MILESTONE 6 — RESEARCH ASSISTANCE

Only after the core platform works:

- Source discovery
- Research queues
- Duplicate detection
- Claim extraction
- Contradiction assistance
- AI-assisted research

No automatic publication.

Paid services require explicit approval.

---

# 64. V1 INTERACTIVE LEAK SCOPE

Interactive Leaks is strategically important, but it must not delay the publication launch indefinitely.

The first version may focus on a few defensible models, for example:

- Battery/energy modeling
- Display power implications
- Basic thermal envelope scenarios
- Performance scenario comparison

Additional modules can follow after calibration.

Quality matters more than quantity.

---

# 65. ARCHITECTURAL EXTENSIBILITY

The architecture should allow future expansion into:

- Tablets
- Laptops
- Wearables
- GPUs
- Processors
- Displays
- Other consumer electronics

Do not hardcode the intelligence system around smartphones.

A smartphone may be the initial dominant device type, but it is not the entire future product.

---

# 66. INTERNATIONAL PRODUCT

Do not architect PhoneFuturist around a single country.

Support:

- International dates/time zones
- Global product releases
- Regional device variants
- International audiences

English is the initial publication language.

Localization may come later.

---

# 67. PHONEFUTURIST'S DIFFERENTIATOR

The differentiator is not simply having:

"news + forum."

Many websites have those.

The defensible product is the connection between:

```text
JOURNALISM
+
STRUCTURED PROVENANCE
+
DEVICE INTELLIGENCE
+
COMMUNITY PREDICTIONS
+
INTERACTIVE MODELING
+
EVENTUAL REAL-WORLD RESOLUTION
```

Example:

PhoneFuturist reports a battery rumor.

The claim enters the device's historical intelligence.

Readers discuss it.

Users make predictions.

Interactive Leaks model possible consequences.

The product launches.

The rumor is resolved.

Predictions are resolved.

Simulation assumptions can be compared against reality.

PhoneFuturist develops a historical record of what was known, when it was known, who reported it, what the community expected, and what actually happened.

That loop should guide architectural decisions.

---

# 68. SUCCESS CONDITION

PhoneFuturist V1 should eventually make this possible:

A new writer joins PhoneFuturist.

They receive the Writer role.

They enter `/studio`.

They create a properly sourced technology story.

They submit it.

An editor reviews it and requests a correction.

The writer revises it.

The editor approves it.

A publisher publishes it.

The story appears publicly with correct author, metadata, classification and sources.

A reader discovers the story through the site or search.

The reader creates an account.

They discuss the story using the same identity used throughout PhoneFuturist.

The story can be connected to a canonical device and structured rumor.

That rumor can eventually provide inputs to an Interactive Leak.

Users can make resolvable predictions concerning that device.

When reality becomes known, claims and predictions can be resolved without destroying the historical record.

All of this remains useful with every AI feature disabled.

That is the product.

---

# 69. CURRENT INSTRUCTION

Do **not** begin implementation yet.

Review this complete specification as a senior product architect and senior full-stack engineer.

Return:

1. Your interpretation of the product and its most important architectural requirements.
2. Proposed frontend framework and rationale.
3. Proposed Supabase/PostgreSQL architecture.
4. Proposed high-level database/domain model.
5. Authentication and authorization strategy, including RLS.
6. Editorial workflow architecture.
7. Community/discussion architecture.
8. Prediction architecture.
9. Intelligence/provenance architecture.
10. Interactive Leak simulation architecture.
11. Search strategy for the zero-cost MVP.
12. Storage/media strategy.
13. SEO/rendering strategy.
14. Deployment recommendation.
15. Testing strategy.
16. Security risks that must be addressed from the beginning.
17. Proposed development milestones with acceptance criteria.
18. Features from this specification you recommend deferring.
19. Requirements you believe are contradictory, risky, unnecessarily complex, or underspecified.
20. Any architectural decisions that should be settled before Milestone 0 begins.

Challenge weak assumptions.

Do not blindly agree with this specification.

Prefer simple, durable architecture over impressive complexity.

Do not optimize for hypothetical millions of users at the expense of getting PhoneFuturist launched.

Do not write application code yet.

Wait for architectural approval before implementation begins.