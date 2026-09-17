# Cloudflare development deployment

Target: `phonefuturist-dev`, Workers Free, stable workers.dev address. Deployment is pending Cloudflare browser authorization; no live origin has been verified yet.

## Authorization

Authorize Wrangler through its Cloudflare browser login flow in the intended account. Credentials stay with Wrangler/Cloudflare; never send OAuth tokens or API tokens in chat. If Cloudflare asks you to register an account-wide workers.dev subdomain, choose the desired stable subdomain in Workers & Pages. No custom domain or paid plan is needed for this milestone.

## Runtime settings after the first deployment

Open Workers & Pages → phonefuturist-dev → Settings → Variables and Secrets. Add these runtime values and deploy the settings:

| Name | Value |
| --- | --- |
| `APP_ORIGIN` | Exact HTTPS origin returned by the deployment, without trailing slash |
| `SUPABASE_URL` | The intended development project's API URL from Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Its `sb_publishable_...` key; never the secret or service-role key |

The app uses server-side runtime bindings, not build-time environment substitution. Until all three values are present, account/authentication routes intentionally return 503; the publication shell can still be inspected. Wrangler preserves dashboard variables on subsequent deployments.

## Supabase Auth URL configuration

After the real origin is known, set Site URL to that exact origin and allow these exact redirect URLs:

- `<development-origin>/auth/callback`
- `<development-origin>/auth/callback?next=/account/password`

Keep any still-needed localhost callback entries. Avoid wildcard production redirects. If the Supabase project also serves another application, preserve its Site URL until the intended project separation is confirmed. Google Cloud's authorized OAuth redirect remains the Supabase provider callback shown in Supabase, not the Worker URL.

## Verification and acceptance

Verify the deployed shell, security headers, missing/invalid-origin rejection and account redirects. After runtime settings and the Foundation database migration are applied, verify Google login, email confirmation, recovery, MFA and role restrictions. A successful Worker upload alone does not satisfy Milestone 0 acceptance. External SMTP delivery and the free-plan runtime budget remain acceptance checks.
