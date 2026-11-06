# OAuth Atlas

**Know what it takes to connect an app — before you build.**

A developer building an AI agent wants their users to connect a third-party app. Before launch they may need to register an OAuth app with that provider and get it approved. OAuth Atlas turns scattered provider docs into a guide that says **how hard it is, how long it takes, what can block approval, and exactly what to do next** — and shows where each claim came from.

- **Live:** https://oauth-atlas.harsh3dubey.workers.dev
- **Demo script (3 min):** [docs/demo.md](docs/demo.md)

## What a reviewer can try

1. **Browse 21 reviewed guides.** Each card shows a difficulty badge (Easy / Moderate / Hard / Unclear) and hands-on time. Gmail, Google Drive/Calendar, Outlook and Salesforce come out *Hard* (provider verification or security review); most others *Moderate* (admin approval or marketplace gates).
2. **Open a guide.** The *At a glance* panel answers the brief in one screen: difficulty and why, hands-on time vs waiting time, **what the agent did, what it can do for you now, and where you take over** (you, your admin, each end user, the provider).
3. **Submit any app** — a name or a website. The agent researches live (median ~4 s) and saves a shareable, unlisted guide. Try something unfamiliar: *Attio*, *Raindrop*, *Cal.com*, *Calendly*.
4. **Click any of the 100 apps** in the directory: 21 open reviewed guides, 79 start a live research run.
5. **Get unstuck.** “I’m stuck here” on any step returns a labelled hypothesis, a diagnostic, an owner and a fallback, grounded in that step’s sources.
6. **Share.** Copy the link, export Markdown, or download a setup pack (app description, scope justifications, callback checklist, review notes) with unknowns left as placeholders.

## The problem, as understood

Three things are easy to conflate and the product keeps them apart:

| Concept | Who owns it | Why it matters |
| --- | --- | --- |
| **The provider OAuth app** (client id/secret, redirect URI, scopes, review status) | Developer, registered once with the provider | Registration and approval is the slow, uncertain part. A managed OAuth app (e.g. Composio’s) can remove this step — but only if it covers the exact scopes. |
| **Your integration** | Developer | Exchanges codes for tokens, refreshes them, calls the API. |
| **Each user’s connection** | End user (and sometimes their org admin) | Consent per user; admin approval can be required independently of provider review. |

And two milestones that behave very differently: **a first test** (often an hour on your own account) and **a customer launch** (can involve verification, security assessments, marketplace review, user caps — weeks, sometimes unknowable). Every guide has a separate *test path* and *launch path*, and separates **hands-on time** from **waiting time**.

## Key decisions

- **Evidence over confidence.** Every claim carries a label — *Official docs* (a retrieved provider page, with the condition it applies under), *Estimate* (a planning range with assumptions), *Unverified* (the docs don’t say; flagged, not guessed), *Tested* (only from a recorded successful attempt; schema-enforced, none claimed). The schema rejects a claim without evidence and a “tested” label without a successful recorded attempt.
- **A free, deterministic research agent by default.** No LLM, no paid search API, no key. It is bounded and auditable: identify → discover docs → read → extract → check → validate → save. An optional OpenAI-backed adapter exists but was not verified (no API credits); it never runs implicitly.
- **Difficulty is computed, not asserted.** The badge is derived from the guide’s own labelled approvals and launch status (rules on the About page), so it can’t contradict the evidence.
- **Agent vs human is explicit.** The agent researches, quotes, checks endpoints without credentials, drafts the setup pack and diagnoses blocked steps. Humans sign in, register apps, consent, approve, and submit for review. The app never collects secrets or submits anything.
- **Scope.** Prepared, reviewed snapshots for 21 apps with deliberately different challenges, plus a live path for everything else — rather than 100 shallow guides.

## The 21 reviewed guides

| App | Scenario | Difficulty | The nuance it surfaces |
| --- | --- | --- | --- |
| GitHub | Read issues in selected private repos | Moderate | GitHub App vs OAuth App; org owner installs |
| Slack | Post a digest in one workspace | Moderate | Workspace approval vs Marketplace distribution (source wording conflict preserved) |
| Gmail | Summarize inboxes for customers | Hard | Restricted scope; 100 test users, 7-day test tokens; verification + possible security assessment |
| Tally | Weekly digest of intake forms | Moderate | Hosted MCP OAuth vs broad REST keys; token-bearing response links |
| Notion | Search pages for an assistant | Moderate | Page-by-page sharing via the picker |
| Linear | Triage team issues | Moderate | `actor=app` attribution; third-party app approvals |
| Discord | Post announcements with a bot | Moderate | Bot install permissions; verification at 100+ servers |
| Dropbox | Index a team folder | Moderate | 500-user development cap; production approval within 2 weeks of the 50th user |
| Google Drive / Calendar | Read files / schedule events | Hard | Non-sensitive `drive.file` vs restricted scopes; sensitive-scope verification |
| Microsoft Outlook | Mail across tenants | Hard | Publisher verification; tenant admin consent |
| Salesforce | CRM data | Hard | AppExchange security review |
| HubSpot, Zoom, Shopify, Figma, Asana, Airtable, ClickUp, Trello, Todoist | Varied | Moderate | Marketplace review, protected customer data, private vs public apps, workspace distribution |

## Live generation — how it works and how well

For a submitted name or URL the agent:

1. **Identifies the provider**: a curated 100-app directory (name → official domain → developer-docs host), else a public identity record (Wikidata, disambiguated by official website), else the obvious domains — accepted only if the site names the product, and labelled **unverified**.
2. **Discovers developer docs**: probes `developers.*`, `docs.*`, `developer.*` and `llms.txt` indexes (including nested ones) before the marketing site.
3. **Reads up to 8 pages**, prioritising OAuth, scopes, registration, callback and review topics; follows only provider-domain links; treats page text as untrusted data.
4. **Extracts and quotes** provider-specific facts: authorize/token endpoints, PKCE, token lifetimes, refresh behaviour, redirect rules, user caps, published review times, scope candidates.
5. **Checks the authorize endpoint without credentials** and records what happened as an *entry-point check* — never a “tested” claim.
6. **Estimates** hands-on time (labelled estimate) and waiting (published figure, or explicitly “not published”).
7. **Validates** every reference with Zod and saves an unlisted guide in D1.

**Measured** across all 79 directory apps without a reviewed guide ([full table](docs/directory-sweep.md)):

| | Result |
| --- | --- |
| OAuth method established | **81%** (64/79) |
| Backed by official-docs evidence | **86%** |
| ≥ 5 provider-specific steps | 81% |
| Authorize/token endpoints extracted | 47% |
| Authorize endpoint actually checked | 34% |
| Median outbound requests (Workers cap 50) | 18, max 28 |

The first sweep found OAuth for **47%**. Adding 37 directory entry pages — each fetched and confirmed to describe OAuth before being added — raised it to about 81% (live docs vary a point or two between runs). Before docs-host discovery existed, even Calendly and Miro produced empty guides. The 15 misses (e.g. QuickBooks, Xero, PayPal, eBay, TikTok, Vimeo) publish docs that need JavaScript or block automated readers; their guides say so and link the docs host instead of guessing.

## What was tested, sourced, and left uncertain

See [docs/validation.md](docs/validation.md) for the full record.

- **Automated:** 43 tests — schema invariants (no evidence-free claims, no fake “tested”), SSRF/DNS/redirect guards, request budget, size truncation, discovery and fact extraction on mocked docs, the unverified-identity path, persistence, SSE, help.
- **Live:** the sweep above; individual runs for Calendly, Miro, Pipedrive, Attio, Raindrop and Cal.com.
- **Source audit (7 Nov 2026):** all 118 sources cited by the reviewed guides were re-fetched. **10 dead links were found and replaced** with pages confirmed to contain the claim’s key terms; **one claim was downgraded** to unverified (Figma org app governance) because no live page supports it; the Dropbox guide gained its missing production-approval gate. 22 sources are reachable only through redirects with query strings (Google, Salesforce), confirmed HTTP 200 separately.
- **Not done:** no provider app was registered and no OAuth connection completed — that needs real accounts and credentials, which stay out of this project. Authorize-endpoint checks are unauthenticated GETs. Review durations are shown only when a provider publishes them.

## Run locally

Node 24, npm.

```powershell
npm ci
npm run build
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm start   # http://127.0.0.1:5173
```

No key or env file is needed. Verification:

```powershell
npm test; npm run typecheck; npm run lint; npm run build
node scripts/research-probe.mjs Calendly Attio          # live research from the CLI, with request counts
node scripts/directory-sweep.mjs                        # regenerate docs/directory-sweep.md
node scripts/verify-research.mjs                        # 18 HTTP checks against a running Worker
```

## Deploy (Cloudflare Workers + D1)

1. `node node_modules/wrangler/bin/wrangler.js login --scopes account:read user:read workers_scripts:write d1:write`
2. Create a D1 database; copy `cloudflare.deployment.example.json` to ignored `.deployment/cloudflare.json` with real IDs.
3. `npm run deploy` — builds, scans client assets for secrets, applies migrations, deploys.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RESEARCH_MODE` | `docs` | Only `openai` enables the optional model adapter |
| `RESEARCH_MAX_PAGES` | `8` (3–12) | Pages read per research run |
| `RESEARCH_MAX_SOURCES` | `12` (2–20) | Sources kept per guide |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, … | unset | Optional model mode only; server-side secret |

## Limitations

- Rule-based extraction can miss nuance or pick a less relevant page; the guide always shows its sources and open questions.
- Docs that require JavaScript, sign-in, or block bots yield partial guides (named, not guessed).
- Identity for names outside the directory and Wikidata is inferred and labelled unverified.
- Difficulty is per scenario; a different audience can change it — research again with your scenario.
- No accounts, ACLs or billing; generated guides are unlisted but viewable by anyone with the link. Rate limits: 12 research runs per caller per hour, 60 globally.

## Growing to 100+ reviewed guides

The directory already covers 100 apps live. To promote one to a reviewed guide: generate it live, review each claim against its source, fix or downgrade, add it to `lib/guides.ts`, and re-run `scripts/recheck-sources.ts` periodically to catch dead links. Refreshes go into an unlisted variant first; re-rendering never makes old evidence fresh.

See also [architecture](docs/architecture.md) and [deployment](docs/deployment.md).
