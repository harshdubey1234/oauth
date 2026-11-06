# Validation record

## Audit and live-research upgrade — 7 November 2026

**Why.** A self-review against the assignment found that live generation — the flow reviewers test — failed on common apps: *Calendly* read only the marketing homepage (no OAuth, no steps), *Miro* fetched nothing (ambiguous name), and every generated guide said effort and waiting were "not estimated". Seventeen reviewed guides added on 6 Nov also had unconfirmed retrieval timestamps.

**Live research changes and results.**

| Before | After |
| --- | --- |
| Calendly: OAuth unknown, 0 steps, 0 scopes | OAuth 2.0, 8 steps ("Register your app — follow ‘Creating an OAuth app’"), 6 scopes, real authorize/token endpoints, PKCE and token-lifetime quotes, 1–3 h estimate, authorize endpoint checked |
| Miro: 0 pages (ambiguous) | Resolved via directory; OAuth 2.0 from developers.miro.com |
| Attio, Raindrop (not in any list): empty | Identity inferred from the name and labelled unverified; Raindrop correctly chose raindrop.io (links to developer docs) over raindrop.com (a different company) |
| Directory sweep, 79 apps: 47% OAuth established | 81% established, 86% with official-docs evidence, median 18 / max 28 outbound requests |
| Attio "endpoints" were docs pages (`docs.attio.com/docs/oauth/authorize`) | Docs-host and retrieved-page URLs are excluded from endpoint extraction (found in a live run; covered by a test) |

Each of the 37 directory entry pages added during this work was fetched with the agent's own fetcher and accepted only if it loaded and described OAuth. 12 candidates that could not be confirmed (JavaScript-rendered or bot-blocked docs) were left out rather than guessed. Full per-app table: [directory-sweep.md](directory-sweep.md).

**Reviewed-guide source audit.** All 118 sources cited by the 21 reviewed guides were re-fetched (`scripts/recheck-sources.ts`):

- **10 dead links (HTTP 404)** in the Notion, Linear, Figma, HubSpot, Zoom and Shopify guides. Nine were replaced with live pages confirmed to contain each claim's key terms (for example HubSpot's v1 token guide states `expires_in: 1800`, which supports the 30-minute lifetime used in that guide). Step links were repointed.
- **One claim downgraded** to *Unverified*: Figma organization app governance — no live page supporting it was found.
- **One HubSpot claim narrowed**: deal endpoints and scopes were removed from an evidence note because the recheck did not re-confirm them.
- **Dropbox gap fixed**: the guide lacked Dropbox's production gate (development apps capped at 500 users; production approval required within two weeks of the 50th linked user). Added from the developer guide as a distribution approval, waiting item and first blocker.
- 22 sources are reachable only via redirects carrying query strings or via `#fragment` URLs that the research fetcher refuses by design; each was confirmed HTTP 200 with a normal request.
- The 17 guides' retrieval timestamps now record this recheck instead of a copied placeholder time. Claim wording beyond the items above was not re-reviewed line by line.

**Product changes informed by the audit.** Difficulty badge and hands-on time on every card; an *At a glance* panel on every guide (difficulty and why, hands-on vs waiting, agent did / agent can do / you take over); a 100-app directory; evidence labels on the homepage now match guide pages (*Official docs / Estimate / Unverified*).

**Tests.** 43 automated tests pass, including new ones for directory resolution, developer-host discovery and quoted fact extraction, the unverified name-guess path, the request budget and page truncation. Still not done: no provider app registration or OAuth connection (requires real accounts and credentials).

## Original record — 6 November 2026

All provider policy findings below come from retrieved official public sources. None represents an approved app, completed registration, authenticated form inspection, or successful connection. Times in guide snapshots refer to this research session in UTC.

| Claim / step checked                    | Method and source / observation                                                                                                                                                                                                                                                   | Correction or decision                                                                                                                                     | Remaining uncertainty                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Managed vs developer-owned registration | Read [Composio managed-auth docs](https://docs.composio.dev/toolkits/managed-auth)                                                                                                                                                                                                | Distinguish registration ownership from per-user consent. Toolkit API identifies managed auth methods; don't infer exact scenario coverage.                | No authenticated toolkit lookup or scope-coverage check performed.                                                                        |
| GitHub App vs OAuth App                 | Read [official comparison](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps) and [registration instructions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) | Choose a GitHub App for the selected-private-repository issue-reader example. Keep OAuth App broad repo access as an explicit alternative.                 | Organization policy, installer authority, and Composio auth-model suitability remain scenario-specific.                                   |
| Issue endpoint permission               | Inspect [List repository issues](https://docs.github.com/en/rest/issues/issues), fine-grained token section                                                                                                                                                                       | Confirm Issues repository permission at read level; don't request code access for this read feature.                                                       | Additional endpoints require independent permission mapping.                                                                              |
| GitHub registration entry               | Research-browser request to `https://github.com/settings/applications/new`                                                                                                                                                                                                        | Tool returned robots.txt denial. Record a blocked entry-point check, not an observed login gate or tested registration.                                    | Actual form was not accessible in this environment.                                                                                       |
| Slack single-workspace vs distribution  | Read [distribution docs](https://docs.slack.dev/app-management/distribution/)                                                                                                                                                                                                     | Separate associated-workspace installation, multi-workspace OAuth, early pilot, and Marketplace path. Preserve the same page's commercial wording tension. | Page says “should be submitted and approved” in one section and calls submission recommended later. Applicability requires clarification. |
| Slack scope and administrator approval  | Read [chat:write](https://docs.slack.dev/reference/scopes/chat.write/), [OAuth flow](https://docs.slack.dev/authentication/installing-with-oauth/), and [workspace approval](https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace)                    | Digest example posts, so don't add conversation-history scopes. Workspace approval is a separate gate.                                                     | Actual workspace policy and posting-channel permissions are unknown.                                                                      |
| Slack creation entry                    | Open [Your Apps](https://api.slack.com/apps)                                                                                                                                                                                                                                      | Public page states sign-in is needed to create an app. Record blocked entry-point check only.                                                              | No app form or authenticated fields inspected.                                                                                            |
| Gmail scope class                       | Read [Gmail scope reference](https://developers.google.com/workspace/gmail/api/auth/scopes)                                                                                                                                                                                       | `gmail.readonly` is restricted; `gmail.send` is sensitive and cannot provide read access. Metadata excludes bodies.                                        | Actual endpoint and data-flow map must come from the developer.                                                                           |
| Gmail test audience and expiry          | Read [Manage App Audience](https://support.google.com/cloud/answer/15549945)                                                                                                                                                                                                      | External Testing allows up to 100 listed users; Gmail authorizations in Testing have a seven-day lifetime. Don't confuse this with production readiness.   | Organization restrictions still apply; test success does not validate external launch.                                                    |
| Gmail launch review and exceptions      | Read [restricted verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) and [verification exceptions](https://support.google.com/cloud/answer/13464323)                                                        | Keep verification and server-data-dependent assessment conditional on audience/data flow and exceptions. No approval timeline invented.                    | Assessment applicability, allowed application type, and review duration require actual project details.                                   |
| Google Cloud client entry               | Open `https://console.cloud.google.com/auth/clients`                                                                                                                                                                                                                              | Redirect observed to Google Sign in for Cloud Platform. Stop before authentication.                                                                        | No Cloud project or OAuth client created.                                                                                                 |
| Gmail API prerequisite                  | Read [official Node quickstart](https://developers.google.com/workspace/gmail/api/quickstart/nodejs), API-enable section, and [web-server OAuth docs](https://developers.google.com/identity/protocols/oauth2/web-server)                                                         | Cite API enablement separately from consent configuration. Quickstart is a desktop example; web callback instructions come from web-server docs.           | Actual backend callback and agent-client options need project-specific confirmation.                                                      |
| Live unfamiliar-provider test: Notion   | Real free app-runtime retrieval of OAuth, capabilities and distribution pages                                                                                                                                                                                                     | Extracted OAuth 2.0 and a read-content capability, with linked source instructions and unknown launch conditions.                                          | No OAuth connection was created; guide remains partial.                                                                                   |

## Standalone migration verification — 6 November 2026

- 38/38 core tests passed. External HTTP in automated tests is mocked explicitly; persistence uses real SQLite through a D1-interface double.
- Type checking passed. Lint passed, and the standalone entry point was rechecked after its export warning was corrected.
- The independent production Worker build passed with direct Cloudflare Vite integration and D1 binding; no separate hosting runtime is required.
- Client scan checked 15 assets and found no server model adapter or credential patterns.
- D1 schema migrations applied to a fresh local database. Five exported guides imported successfully and all five reopened with their existing IDs.
- 16/16 local HTTP checks passed, covering prepared SSR/API content, library visibility, mode status, unsafe input, cross-origin rejection, contextual help, missing guide, and the local synthetic shared fixture.
- 18/18 live-research HTTP checks passed on the standalone built Worker. Actual public documentation retrieval established Notion OAuth 2.0 and a read-content capability, saved guide af89c473-abd3-4867-85b8-a02694801b02, reused duplicate submissions, reopened without cookies, retrieved the selected source again for help, retained durable jobs and excluded the generated variant from library search.
- Package manifest dependency sets agree with the lockfile. Local credentials, deployment-account settings, data exports, dependencies and runtime state are excluded from the submission package.
- Hosted deployment and runtime verification are recorded below. Sustained-load behavior remains untested. No provider OAuth app registration or authenticated provider API connection was completed.

## Verified Cloudflare publication — 6 November 2026

- Public URL: https://oauth-atlas.harsh3dubey.workers.dev
- Worker: `oauth-atlas`.
- Version: `8d43834c-fef4-4fd1-9c0b-e348b7bcef97`.
- Worker startup reported 9 ms; publication and its public endpoint completed successfully.
- Five existing saved guides were imported into the account-owned D1 database; all five IDs reopened through the new public API.
- 18/18 hosted research/help checks passed. Actual Notion documentation retrieval, evidence extraction, durable saving, duplicate handling, cookie-free reads, rendered source links, fresh callback help, library exclusion and job retrieval all passed.
- [Verified hosted Notion guide](https://oauth-atlas.harsh3dubey.workers.dev/guides/692f4232-b639-4392-ae69-6864c4b84478).
- Homepage, About and all prepared guide pages returned 200 and had no unwanted platform names in visible text or metadata.
- No paid model calls or account-plan upgrade was required by this deployment. Normal Cloudflare request, storage and CPU quotas still apply; sustained-load behavior was not tested.
- Account settings, data import files and credentials remain outside the submission archive.

### Verification boundary

At the initial Cloudflare publication, the new hosted deployment passed the 18 research/help checks and all five migrated-guide reads. Native desktop browser automation initially stopped at its current-URL verification guard, so that publication did not claim a new-domain visual pass. The later studio-redesign verification below records the subsequently completed desktop and phone browser checks. Full keyboard/download testing remains unverified.

## Independent app addition: Tally — 6 November 2026

- Added Tally as the fourth prepared guide and labeled it “Independent pick” in the library and guide header. The library uses two columns on desktop and one on narrow screens.
- Scenario: read completed responses from one controlled team intake form and preview a weekly internal digest. The guide separates hosted MCP OAuth from the broader REST API-key alternative and keeps customer-app launch policy unresolved.
- Seven official source receipts retain actual HTTP-200 retrieval timestamps, short excerpts and SHA-256 hashes. Public OAuth discovery was read with GET only; no registration, authorization, token exchange or authenticated form read was performed.
- The response schema's non-expiring signed links are explicitly excluded from the proposed digest. The 30–60 minute setup allowance is labeled as an estimate with prerequisites, not an observed duration.
- 39/39 core tests passed, including Tally evidence, access-boundary, launch-status and export assertions. Type checking and lint passed. The production build passed and the client scan checked 15 assets.
- 18/18 local HTTP checks passed after initializing local D1 for the deployed database ID. These cover all four prepared routes, library visibility, input guards, help, missing guides and cookie-free shared persistence.
- 8/8 Tally HTTP checks passed locally and on the public Worker. They cover the native guide link, independent-pick label, all four library entries, rendered guide, cookie-free API, seven source fingerprints, honest attempt labels, sensitive-link warning and selected-step help.
- All five previously migrated guide IDs remained readable after adding Tally. No remote schema or stored-guide changes were needed.
- Published Worker version: `981a988f-f8d6-48d1-a0a5-00f524eb00bf`; startup reported 11 ms. [Public Tally guide](https://oauth-atlas.harsh3dubey.workers.dev/guides/tally).
- The complete Markdown guide was exported from the hosted guide data. Source packaging excludes credentials, account settings, runtime state, dependencies and data exports.
- The browser interaction/visual boundary above still applies. HTTP route checks do not claim a fresh browser click or layout pass.

The rationale, sources and human handoff are also recorded in [the Tally research note](tally-guide.md).

## Studio interface redesign — 6 November 2026

- Published version: `dee7a03e-87d2-44ca-a1ac-f8397e920253` at https://oauth-atlas.harsh3dubey.workers.dev. Worker startup reported 9 ms.
- Replaced the homepage presentation with a graphite hero, a CSS 3D cube, floating provider tiles, SVG connection paths and restrained violet accents. The geometry uses no external model, WebGL dependency or animation render loop.
- Restyled navigation, research controls, library cards, guide headings, next actions and reading surfaces. Geist remains self-hosted. Removed the duplicate guide breadcrumb and corrected provider-icon shrinking.
- Added scenario filters that combine with the existing library search. Filter buttons expose pressed state, and a result status reports the count. The scene exposes a working pause/resume button; CSS disables decorative animation for reduced-motion preferences.
- Type checking, focused lint, production build and the 15-asset client scan passed. No dependency inputs changed.
- 18/18 local HTTP checks passed for the redesigned build. The 8/8 Tally checks passed locally and against the final public deployment. Public CSS loaded with the 3D and reduced-motion rules, and all five previously migrated guide IDs remained readable.
- Native browser inspection verified the desktop hero, research surface and two-column cards. The animation control changed to “Resume decorative animation” after pausing. The hero's library action navigated to `#guides`.
- In the browser, Customer apps reduced the library to Gmail; Independent pick reduced it to Tally. Clicking the Tally card opened its guide with the expected next-action content.
- The public site was also inspected with the browser's iPhone SE viewport at 375 × 667 and 100% preview scale. The header, hero, full 3D tiles, library search, filters and single-column cards fit the phone view. The Independent pick filter and Tally card navigation worked on the published site.
- Final desktop inspection confirmed the guide-header refinements and returned the browser to the published homepage. Responsive inspection tools were closed afterward.
- These are focused visual and interaction checks, not an exhaustive accessibility or device audit. Automatic reduced-motion emulation and download interactions were not separately exercised in this pass; the native pause control and motion stylesheet were checked.
- Credentials, deployment settings, runtime state, dependencies and database exports remain excluded from the refreshed source archive.
