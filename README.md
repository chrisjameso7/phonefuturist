# PhoneFuturist

The future of technology, tested before it exists.

Professional technology publication and intelligence platform. Initial stack: Astro, React, TypeScript, Cloudflare Workers, and Supabase/PostgreSQL. Essential functionality must work without AI.

## Current scope

Milestone 0 — Foundation is in progress. This branch contains the application shell, authentication foundation, permission schema candidate, and documentation. Hosted acceptance is pending. Article publishing, forum, predictions, intelligence, and simulations are not implemented in Foundation.

## Develop

Use Node 22.12 or newer. Install with `npm ci`, configure `.dev.vars` from `.dev.vars.example`, and use `npm run dev`. Run `npm run verify` before review. Missing account configuration returns an intentional 503 on protected/authentication routes.

See [setup and external prerequisites](docs/setup.md), [implementation status](docs/implementation-status.md), [security](docs/security.md), [accepted ADRs](docs/adr), [master specification](docs/master-specification.md), and [approved roadmap](docs/architecture-review.md).

No paid services are authorized. No fabricated content or seeded administrator is included. Do not begin Milestone 1 until Foundation acceptance is satisfied and reviewed.
