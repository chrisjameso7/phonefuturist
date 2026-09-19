# Approved Admin MFA exception — ADR-003 amendment

Accepted by the owner on 18 September 2026. Supersedes the universal Admin MFA requirement only for the three approved Auth UUIDs provisioned separately. Supabase/PostgreSQL and the remaining architecture are unchanged.

James is the designated primary Admin. The owner separately authorized Spygo's Admin role. `supabase/provision-approved-admin-exceptions.sql` is an idempotent, operator-only script for these exact accounts. It validates active accounts, verified emails and existing roles before granting exceptions. It cannot reactivate a revoked exception. The script records the owner's approval as the authorizing actor and explicitly identifies controlled provisioning as the execution mechanism; it does not claim a browser-authenticated action occurred.

`private.privileged_mfa_exceptions` contains UUID, Admin scope, authorizing actor, reason, grant time, optional expiry and revocation details. No expiry was requested. Private tables have RLS and no client table grants. There is no grant/reactivation API. Email and user-editable metadata never determine exemption eligibility. Exceptions do not grant roles; a demoted Publisher must meet normal MFA requirements.

The shared database `current_access()` policy combines a live Admin role and an active exception. It preserves actual AAL, email verification, account/banned status and session revocation checks. All Studio capabilities and route guards consume this policy. An existing verified factor is retained, but the approved exception overrides the application's MFA requirement for that Admin. Provider operations that require actual AAL2 are unaffected. A compromised exempt AAL1 session can exercise full Admin authority. Audit history cannot prevent takeover.

The primary Admin can list/revoke exceptions at `/account/security`. The database independently checks primary UUID, active account, verified email, valid session and effective Admin access. Revocation requires a reason, is idempotent and audited. Self-revocation is supported and restores mandatory MFA on subsequent requests. Already completed or in-flight transactions are not undone. Restoring exceptions or changing the primary Admin requires a separately authorized operator change.

## Enrollment and session behavior

The security page uses `listFactors().all` for unfinished TOTP factors; the SDK's `.totp` array contains only verified factors. Cancellation is explicit, caller-scoped and limited to unverified TOTP through `unenroll()`. Verified factors are never removed by this recovery path. Supabase remains the authority for concurrent factor changes and assurance requirements. Errors expose only a bounded provider code; server logs include operation, code and HTTP status, never QR/secret/OTP/token or full provider messages. The original account-specific enrollment cause remains unconfirmed until an authenticated response is observed.

Persistent HttpOnly, Secure (HTTPS), SameSite=Lax cookies retain the Supabase SDK's lifetime and refresh/deletion behavior. Server-side `getUser()` verifies identity and refreshes expiring tokens. No localStorage bypass, remembered-device claim or fabricated AAL2 exists. Already verified sessions are not asked to enter another code on the security page. A new browser, cleared cookies, explicit sign-out or revoked/expired provider session can require login again. Other Admins/Publishers still need MFA for a new AAL1 session. Existing AAL2 sessions persist through token refresh. This is not a promise of indefinite login.

## Verification

Local tests execute the actual exception policy and provisioning script in disposable PostgreSQL (PGlite), covering all three approved IDs, normal Admin/Publisher denial at AAL1, direct table/API privilege denial, status/email/session/role checks, expiry, email changes, primary-only revocation, self-revocation, grant idempotency and no resurrection. MFA tests cover unfinished/verified/foreign factor handling and safe logging. An SDK-backed session test verifies persistent cookie flags, server refresh retaining AAL2 and sign-out cookie removal using a mocked Auth service. Hosted multi-browser/session acceptance remains separate.

## Deployment / remaining operator step

18 September 2026: all 29 local tests, Astro/TypeScript check and production build passed. Hosted schema migration 20260918084405 is applied. The SQL connector rejects data writes with `cannot execute INSERT in a read-only transaction`; the provisioning transaction therefore made no changes. Do not misreport account grants or exceptions as active until the operator runs the reviewed provisioning script and the rows are verified. No Auth internals were changed.

The operator must open Supabase SQL Editor for project ehldokmrgahrlcoyidjy, paste the complete contents of `supabase/provision-approved-admin-exceptions.sql`, and run it once as the authorized database owner. It contains identifiers and policy, no credentials. This both grants Spygo Admin and activates the three exceptions with James as primary. It can safely be rerun, but deliberately cannot reactivate revoked exceptions. Then reload PhoneFuturist. No role bootstrap rerun is needed.

The security advisor reports intentional deny-all private tables plus the pre-existing disabled leaked-password protection warning: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No paid configuration was enabled.
