# Architecture

The browser renders a library and guide reader. Worker routes perform bounded research, validation and contextual diagnostics. D1 stores generated guides, durable jobs and atomic request quotas. Prepared snapshots are versioned source; browser storage contains only private checklist progress.

`worker/index.ts` directly delegates to the Vinext request handler. `vite.config.ts` builds the Worker/assets with Cloudflare's Vite plugin and binds D1 as `DB`. Account-specific settings are ignored in `.deployment/cloudflare.json`. There is no dependency on a separate hosting provider's sign-in or application runtime.

`provider-identity.ts`, `public-fetch.ts`, `docs-parser.ts` and `docs-agent.ts` implement default deterministic research. The optional model adapter is isolated in `research.ts`; default mode never silently switches to it.

- `provider-directory.ts` — 100 apps: official domain, developer-docs hosts, and (for 59) an entry page confirmed by fetching it. Identity and entry points only; no policy facts.
- `provider-identity.ts` — directory → Wikidata (disambiguated by official website) → name-derived domains (accepted only if the site names the product; always `unverified`).
- `docs-agent.ts` — two-stage developer-host discovery (`llms.txt` first), prioritised crawl incl. nested indexes, topic-to-page matching, quoted fact extraction (endpoints, PKCE, lifetimes, redirect rules, caps, review times), an unauthenticated authorize-endpoint check, and labelled estimates.
- `public-fetch.ts` — HTTPS-only, DNS-validated, manual redirects, 700 KB truncation, and a 45-request budget per run (Workers allow 50 subrequests on the free plan).
- `assessment.ts` — difficulty, hands-on vs waiting time, and the agent/human split, derived only from a guide's own labelled data. Used by cards and the guide's *At a glance* panel.
- `guides.ts` + `*-guide.ts` — 21 reviewed snapshots. `scripts/recheck-sources.ts` re-fetches every cited source to catch dead links.

Sources record actual retrieval, timestamps, excerpts and content hashes. Claims refer to evidence and stated conditions. Runtime validation rejects dangling references, step cycles and unsupported Tested labels. A documentation pipeline test is not a successful provider OAuth connection.

Generated guides have opaque, unlisted IDs. A completed stream returns only after storage succeeds. Duplicate request IDs reuse the durable job; changed input cannot reuse the ID. Interrupted jobs time out honestly rather than relying on process-local background work.

Page transitions use native links. Outputs are rendered as plain React text with validated external URLs. No source HTML or instructions are executed. Public DNS and redirect checks, type/size/time limits, input validation and quotas form bounded controls, without claiming a complete DNS-rebinding guarantee.
