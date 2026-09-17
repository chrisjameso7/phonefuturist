# Foundation implementation decisions

- Accepted ADR-001 through ADR-011 and the roadmap are unchanged. Historical planning files retain their original approval boundary; subsequent user authorization enables M0 only.
- Use server-mediated authentication with Supabase SSR cookies. React's first island is a password visibility control; it has no identity authority or access tokens.
- Start with private/no-store responses and noindex pages. Public caching and launch indexing follow reviewed content/launch requirements; security must not depend on caching configuration.
- Use Astro-generated CSP hashes for its hydration scripts instead of allowing arbitrary inline scripts.
- Use a minimal inaccessible-to-clients account/role schema and a caller-scoped access function. There are no editorial/community/simulation tables in Foundation.
- Pin dependencies and commit the lockfile. The Windows environment rejected npm lifecycle subprocesses; installs/checks attempted without automatic lifecycle scripts must be reported separately from a normal clean-install/build verification.
- Canonical repository access uses the GitHub connector because local Git HTTPS credential prompting failed. Work is on `foundation/milestone-0`, with normal parent-linked commits; no force update of main.
- Missing hosted configuration is a blocker to acceptance, not permission to insert fake data, privileged demo users, or relaxed authorization.

- Subsequent user authorization replaces manual milestone reviews with automatic advancement after acceptance checks pass. External setup and architecture changes remain user-controlled.
- The initial CLI migration is now generated and tested. Local Auth keeps email confirmation and TOTP enabled. Hosted replay remains mandatory; local email capture does not prove external SMTP delivery.

- Milestone 0 deploys to a dedicated `phonefuturist-dev` Worker on the account's stable workers.dev subdomain. Version preview URLs are disabled so Auth uses one development origin. `keep_vars` preserves user-managed runtime variables in Cloudflare across deployments; values are not committed. This is development hosting, not production launch.
