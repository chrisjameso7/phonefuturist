# Newsletter and editorial release

## Existing stack and access

Astro server rendering and React islands run on Cloudflare Worker `phonefuturist-dev`. Supabase Auth validates sessions; Studio checks active, verified staff and required MFA. Newsletter Studio additionally requires the existing admin role. Published article content comes only from the public article projection; private notes and drafts are excluded.

## Signup

`/api/newsletter` accepts URL-encoded POSTs with email, optional first_name, consent=yes and an empty website honeypot. `/newsletter` provides a native-form fallback. Existing and new contacts get the same public success message. No email is sent on signup. Only Resend stores subscriber contacts. The service adds the configured segment, explicitly opts into the configured topic, then reads both memberships back before returning success.

The Worker reads its existing RESEND_API_KEY, RESEND_SEGMENT_ID and RESEND_TOPIC_ID at runtime. None are defined in Wrangler or committed environment examples. Local development can set these in a gitignored `.dev.vars` alongside Wrangler configuration; use a dedicated test key and test segment/topic. Never commit that file or copy production secrets into a browser.

The approved NEWSLETTER_LIMITER binding allows six requests per minute per hashed-IP key. Cloudflare limits are approximate and local to each Cloudflare location; this is not a global abuse-prevention guarantee. Missing bindings fail closed.

## Preview, single-address test and draft

1. An administrator opens `/studio/newsletter` through Studio → Newsletter.
2. Select up to eight existing published stories. Supply subject and preview text; optionally include Labs and an editorial note. Press Update preview.
3. Review the inline-styled, 600px HTML and plain-text versions. Stories retain stored titles, summaries, URLs and the site's existing confidence/category mapping.
4. Check the explicit test confirmation and press Send test email. Delivery is restricted server-side to the approved test address, jamesadebajo7@gmail.com. The sender and reply address are contact@phonefuturist.com. Identical preview submissions are deduplicated by Resend's idempotency window.
5. For a draft, check its separate confirmation and press Create draft in Resend. The backend fixes segment_id and topic_id from Worker variables and send:false. Open the returned Resend link. Sending remains a manual dashboard action; the application has no broadcast-send action.

Broadcast HTML and text retain {{{RESEND_UNSUBSCRIBE_URL}}}. A transactional test email instead uses a signed, expiring `/newsletter/test-unsubscribe` link for the approved test contact. Opening it performs no preference change; its confirmation POST opts out only that contact's configured Newsletter topic and verifies the update. To test that flow, first register the approved test address with the public signup form. Re-subscribe afterward if desired. Actual broadcast unsubscribe handling belongs to Resend.

## Provider references

- https://resend.com/docs/api-reference/contacts/create-contact
- https://resend.com/docs/api-reference/contacts/add-contact-to-segment
- https://resend.com/docs/api-reference/contacts/update-contact-topics
- https://resend.com/docs/api-reference/contacts/get-contact-topics
- https://resend.com/docs/api-reference/contacts/list-contact-segments
- https://resend.com/docs/api-reference/broadcasts/create-broadcast
- https://resend.com/docs/dashboard/contacts/manage-topics
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

The official broadcast page's MDX source documents topic_id, even though text extraction can omit its field heading. No undocumented endpoint is used.

## Editorial presentation and authors

Shared StoryImage and StoryByline components preserve stored article attribution. New drafts default to the writer's public creator profile; the verified Studio author directory excludes moderators-only, unverified and restricted accounts. Other enables an explicit manual byline. Existing bylines and article ownership are retained. No names or credits are inferred from article text.

The approved read-only author-directory and public image-attribution migrations add no roles and change no article revisions. The earlier team migration enables admin management at `/studio/team`.

## Privacy draft and limitations

`/privacy` presents a conventional 15-section policy with compact Cloudflare, Supabase, Resend and Google disclosures. It includes reader engagement and optional AI-assisted analysis, distinguishes unsubscribing from deletion, and makes no claim that an unverified consent-management system is active. Legal operator details, jurisdiction-specific disclosures, retention schedules and advertising-consent compliance still need internal legal review. The public page contains no bracketed alternatives or development notes.

Browser rendering checks are not Gmail rendering checks. Actual Gmail phone light/dark rendering and unsubscribe delivery must be checked using the approved single test email. No broadcast was sent during development, and no real draft was created automatically.

## Deployment

Run `npm.cmd run check`, `npm.cmd test`, `npm.cmd run build`, then `npx.cmd wrangler deploy --config dist/server/wrangler.json --keep-vars`. Preserve dashboard-managed settings. Never deploy an ignored local fixture configuration from `.wrangler`.
