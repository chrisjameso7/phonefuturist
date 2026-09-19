# Foundation security boundary

- Authentication is Supabase-managed; the server calls `getUser` for protected pages rather than trusting cookie user data.
- The application has no service-role key. Every request gets its own server Supabase client and HTTP-only, SameSite=Lax session cookies. No browser Supabase client is used in Foundation.
- Mutating forms require the exact configured Origin and bounded URL-encoded bodies. OAuth uses PKCE and an allowlisted local destination; no arbitrary `next` redirects.
- RLS and explicit grants protect profiles. Private account state, grants, and audits have no client table access. Private helpers return only the current caller's state and pin their search path.
- Current account state, verified email, live Auth session, and MFA assurance are evaluated by the database. Client metadata never grants roles.
- Admin and Publisher require MFA before entering Studio or sensitive account operations. MFA enrollment/challenge remains reachable to complete that requirement.
- No public content write API exists in M0. Later domain operations must enforce `private.has_capability` or equivalent verified/active-member policy transactionally; hiding UI is not enforcement.
- Public profiles, uploads, editorial workflows, forum content, and role-management UI belong to later milestones.
- Authentication responses and initial pages are private/no-store. Astro generates script/style CSP hashes; the header supplies frame-ancestor protection. All Foundation routes remain noindex until a reviewed launch.
- Auth provider error payloads, tokens, recovery links, passwords, and QR secrets must not enter logs.

## First administrator

After migrations and email verification are validated, use the Supabase SQL editor as the project owner to grant the intended existing account the `admin` role in `private.role_grants`, and append an `admin_bootstrap` record with its UUID and a reason in `private.access_audit`, in one transaction. Confirm the UUID against the Auth dashboard, not a supplied display name. There is deliberately no public bootstrap endpoint or hardcoded administrator email. The account must enroll and verify TOTP before privileged access.

Routine staff invitation/promotion UI is Milestone 1. Never use metadata edits to simulate a role grant.

## Account restriction and recovery

The project owner can set `private.accounts.status` to suspended/banned and record an audit reason. For lost-factor recovery, verify identity out of band, suspend privileged access, revoke affected sessions, perform provider-supported factor recovery through the trusted administration interface, record a non-sensitive audit event, and require fresh enrollment before reactivation. No app endpoint bypasses MFA. Test recovery before production; exact provider session/factor behavior still needs hosted verification.

Direct API/RLS acceptance and recovery drills remain pending until a Supabase environment is available. The SQL uses real Auth tables and must be exercised against the actual deployed Auth schema before acceptance.
