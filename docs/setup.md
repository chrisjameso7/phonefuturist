# Foundation setup and external prerequisites

No paid resources are authorized. Foundation is not accepted until the hosted checklist passes.

## Local application

Use Node 22.12+ (22 LTS recommended), `npm ci`, then `npm run verify`.
Copy `.dev.vars.example` to `.dev.vars` and supply:

- `APP_ORIGIN`: exact origin, e.g. `http://localhost:4321` (no trailing slash/path).
- `SUPABASE_URL`: the project's API URL.
- `SUPABASE_PUBLISHABLE_KEY`: its publishable key, never secret/service-role.

Run `npm run dev`. Without configuration, public shell pages render while account/auth/Studio routes return 503. This is intentional fail-closed behavior, not an authenticated demo.

## Supabase — user-controlled setup required

1. Create or make accessible a dedicated free PhoneFuturist development project. The connected account returned no projects during inspection. Keep production separate.
2. Keep email confirmations enabled and require passwords of at least 12 characters. Enable TOTP enrollment and verification. Keep Auth rate limits enabled.
3. Configure a free custom SMTP sender with a verified sending identity. Test verification and recovery delivery to an address outside the Supabase organization. Default Supabase SMTP is not public onboarding infrastructure.
4. Set Auth Site URL to the application's actual origin. Allow the exact `/auth/callback` redirect and `/auth/callback?next=/account/password` for development and the intended hosted environment. Avoid production wildcard redirects. Use the standard confirmation link flow with PKCE; do not disable verification.
5. In Google Cloud, configure an OAuth web client and consent settings. Use the callback URL displayed by Supabase for Google (typically `https://PROJECT_REF.supabase.co/auth/v1/callback`). Enter client ID/secret in Supabase's Google provider settings, not application source. Confirm external users can sign in under the consent app's publishing/test-user settings.
6. Apply and validate the versioned migration using the CLI once generated; do not apply the schema candidate blindly to production. Verify only intended API schema/grants are exposed; `private` is not an exposed API schema.
7. Supply the project URL/publishable key through local/runtime settings, not chat secrets. Confirm email/password, Google, logout, recovery, factor enrollment, MFA, and restriction behavior.

## Cloudflare — user-controlled setup required

Use the Free Workers plan. Configure a development Worker first. Set the three runtime variables above in its settings; `APP_ORIGIN` must match the actual HTTPS origin. Do not enable paid image transformations, extra databases, analytics, or other paid add-ons.

Build with `npm run build`. Authenticate Wrangler through your own account and run `npm run deploy` only against the intended environment. Configure GitHub deployment credentials only in repository/environment secrets if automated deployment is desired. CI validation does not require deployment credentials. Configure separate preview variables; never give untrusted PRs production credentials.

Measure representative uncached SSR and auth CPU in Workers, including cold starts and failure paths. A local build is not proof of compliance with the free runtime budget. Verify content security policy, secure cookies, origin checks, and non-caching on the deployed origin.

## Hosted acceptance checklist

- [ ] Clean install, type check, tests, production build.
- [ ] Clean migration replay against actual Supabase Auth schemas; database security advisor reviewed.
- [ ] Direct API tests for reader/staff/anonymous/banned/unverified roles and unauthorized role assignment.
- [ ] External verification and reset emails delivered with confirmation enabled.
- [ ] Google callback and existing-account identity linking reviewed.
- [ ] Admin bootstrap, TOTP enforcement and recovery drill.
- [ ] Logout/session revocation checked; suspended/banned sessions fail immediately at application/database checks.
- [ ] Responsive and keyboard checks, React hydration under CSP, error states.
- [ ] Workers deployment and CPU measurements on the free plan.
- [ ] Review Milestone 0 evidence with the user. Do not start Milestone 1.
