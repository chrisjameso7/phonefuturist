# Cloudflare development deployment

Target: `phonefuturist-dev`, stable workers.dev address. Deployed on 2026-09-17 by the user through the prepared Wrangler build. Verified origin: `https://phonefuturist-dev.phonefuturist.workers.dev`. The homepage returned HTTP 200; `/login` returned the expected fail-closed HTTP 503 until runtime configuration is supplied. Deployment version: `a74b01e9-5328-4528-a8dd-40f9834d7275`.

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

- `https://phonefuturist-dev.phonefuturist.workers.dev/auth/callback`
- `https://phonefuturist-dev.phonefuturist.workers.dev/auth/callback?next=/account/password`

Keep any still-needed localhost callback entries. Avoid wildcard production redirects. If the Supabase project also serves another application, preserve its Site URL until the intended project separation is confirmed. Google Cloud's authorized OAuth redirect remains the Supabase provider callback shown in Supabase, not the Worker URL.

## Verification and acceptance

Verify the deployed shell, security headers, missing/invalid-origin rejection and account redirects. After runtime settings and the Foundation database migration are applied, verify Google login, email confirmation, recovery, MFA and role restrictions. A successful Worker upload alone does not satisfy Milestone 0 acceptance. External SMTP delivery and the free-plan runtime budget remain acceptance checks.
