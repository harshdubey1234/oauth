# Live-research sweep — 2026-11-06

The free research agent (no LLM, no paid API) was run once against every directory app that has no reviewed guide, with the scenario “read the user's records, external customers, launch”. Each run made real public HTTPS requests; nothing was saved. Reproduce with `node scripts/directory-sweep.mjs`.

| Measure | Result |
| --- | --- |
| Apps researched live | 79 |
| OAuth method established (oauth2 / oauth1 / partner-only) | 64/79 (81%) |
| Backed by official-docs evidence | 68/79 (86%) |
| Provider-specific setup steps (≥ 5) | 64/79 (81%) |
| Scope candidates extracted | 20/79 (25%) |
| Authorize/token endpoints extracted | 37/79 (47%) |
| Hands-on estimate given | 64/79 (81%) |
| Authorization endpoint actually checked | 27/79 (34%) |
| Median outbound requests per run (Workers cap: 50) | 18 (max 28) |
| Median duration | 4.5 s |

These are extraction results, not correctness checks: “OAuth established” means the retrieved docs describe it, and every guide still labels unverified facts. Misses are listed so they can be fixed or given a directory entry point.

| App | Identity | OAuth | Official evidence | Steps | Scopes | Endpoints | Estimate | Authorize check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adobe | resolved | oauth2 | 7 | 6 | 1 | — | 2–6 hours (docs incomplete) | — |
| Aircall | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | observed |
| Autodesk | resolved | unknown | 0 | 3 | 0 | — | Not estimated from current evidence | — |
| BigCommerce | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | — |
| Bitbucket | resolved | oauth2 | 11 | 5 | 6 | — | 2–6 hours (docs incomplete) | — |
| Bitly | resolved | oauth2 | 5 | 7 | 0 | yes | 1–3 hours | observed |
| Box | resolved | oauth2 | 7 | 7 | 0 | — | 1–3 hours | — |
| Calendly | resolved | oauth2 | 15 | 8 | 6 | yes | 1–3 hours | observed |
| Canva | resolved | oauth2 | 13 | 8 | 6 | yes | 1–3 hours | observed |
| Close | resolved | oauth2 | 5 | 8 | 0 | yes | 1–3 hours | observed |
| Coinbase | resolved | oauth2 | 14 | 8 | 6 | yes | 1–3 hours | — |
| Confluence | resolved | oauth2 | 16 | 8 | 6 | yes | 1–3 hours | — |
| Constant Contact | resolved | oauth2 | 9 | 7 | 0 | — | 1–3 hours | — |
| Copper | resolved | oauth2 | 6 | 8 | 0 | yes | 1–3 hours | observed |
| Datadog | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| DigitalOcean | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | observed |
| DocuSign | resolved | oauth2 | 5 | 7 | 0 | — | 1–3 hours | — |
| Dropbox Sign | resolved | oauth2 | 6 | 8 | 0 | yes | 1–3 hours | — |
| eBay | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| Etsy | resolved | oauth2 | 7 | 7 | 0 | yes | 2–6 hours (docs incomplete) | — |
| Eventbrite | resolved | unknown | 1 | 3 | 0 | — | Not estimated from current evidence | — |
| Evernote | resolved | oauth1 | 4 | 7 | 0 | — | 1–3 hours | — |
| Facebook | resolved | unknown | 0 | 3 | 0 | — | Not estimated from current evidence | — |
| Fitbit | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | observed |
| FreshBooks | resolved | oauth2 | 13 | 8 | 6 | yes | 1–3 hours | observed |
| Freshdesk | resolved | unknown | 1 | 4 | 0 | — | Not estimated from current evidence | — |
| Front | resolved | oauth2 | 7 | 7 | 0 | — | 1–3 hours | — |
| GitLab | resolved | oauth2 | 10 | 7 | 0 | — | 1–3 hours | — |
| Google Sheets | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| Gorgias | resolved | oauth2 | 4 | 7 | 0 | — | 1–3 hours | — |
| Gusto | resolved | oauth2 | 6 | 7 | 0 | — | 1–3 hours | — |
| Harvest | resolved | oauth2 | 8 | 8 | 2 | yes | 1–3 hours | observed |
| Help Scout | resolved | oauth2 | 2 | 5 | 0 | — | 2–6 hours (docs incomplete) | — |
| Heroku | resolved | oauth2 | 9 | 8 | 1 | yes | 1–3 hours | observed |
| Instagram | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | observed |
| Intercom | resolved | oauth2 | 7 | 7 | 1 | — | 1–3 hours | — |
| Jira | resolved | oauth2 | 16 | 8 | 6 | yes | 1–3 hours | — |
| Klaviyo | resolved | oauth2 | 9 | 8 | 0 | yes | 1–3 hours | observed |
| LinkedIn | resolved | oauth2 | 6 | 8 | 0 | yes | 1–3 hours | — |
| Lucid | resolved | oauth2 | 6 | 7 | 0 | — | 1–3 hours | — |
| Mailchimp | resolved | oauth2 | 6 | 8 | 0 | yes | 1–3 hours | observed |
| Microsoft Teams | resolved | oauth2 | 8 | 7 | 0 | — | 1–3 hours | — |
| Miro | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | observed |
| monday.com | resolved | oauth2 | 9 | 8 | 0 | yes | 1–3 hours | observed |
| Netlify | resolved | oauth2 | 5 | 6 | 0 | — | 2–6 hours (docs incomplete) | — |
| Okta | resolved | oauth2 | 9 | 7 | 1 | — | 1–3 hours | — |
| OneDrive | resolved | oauth2 | 8 | 7 | 0 | — | 1–3 hours | — |
| Oura | resolved | oauth2 | 9 | 8 | 0 | yes | 1–3 hours | — |
| PagerDuty | resolved | oauth2 | 11 | 8 | 1 | yes | 1–3 hours | observed |
| Patreon | resolved | oauth2 | 14 | 8 | 6 | yes | 1–3 hours | observed |
| PayPal | resolved | unknown | 1 | 3 | 0 | — | Not estimated from current evidence | — |
| Pinterest | resolved | oauth2 | 13 | 8 | 5 | yes | 1–3 hours | — |
| Pipedrive | resolved | oauth2 | 9 | 8 | 0 | yes | 1–3 hours | observed |
| Procore | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| QuickBooks | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| RingCentral | resolved | oauth2 | 7 | 8 | 0 | yes | 1–3 hours | observed |
| Sentry | resolved | oauth2 | 15 | 8 | 5 | yes | 1–3 hours | observed |
| Smartsheet | resolved | oauth2 | 6 | 7 | 0 | — | 1–3 hours | — |
| Spotify | resolved | oauth2 | 7 | 7 | 0 | — | 1–3 hours | — |
| Square | resolved | oauth2 | 8 | 7 | 0 | yes | 2–6 hours (docs incomplete) | — |
| Squarespace | resolved | oauth2 | 9 | 7 | 0 | — | 1–3 hours | — |
| Strava | resolved | oauth2 | 9 | 8 | 0 | yes | 1–3 hours | observed |
| Stripe | resolved | oauth2 | 7 | 8 | 0 | yes | 1–3 hours | observed |
| SurveyMonkey | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| TikTok | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| Twitch | resolved | oauth2 | 14 | 8 | 6 | yes | 1–3 hours | observed |
| Typeform | resolved | oauth2 | 14 | 8 | 6 | yes | 1–3 hours | observed |
| Vercel | resolved | oauth2 | 5 | 6 | 0 | — | 2–6 hours (docs incomplete) | — |
| Vimeo | resolved | unknown | 0 | 0 | 0 | — | Not estimated from current evidence | — |
| Webex | resolved | unknown | 0 | 3 | 0 | — | Not estimated from current evidence | — |
| Webflow | resolved | oauth2 | 8 | 8 | 0 | yes | 1–3 hours | observed |
| Withings | resolved | oauth2 | 3 | 6 | 0 | — | 2–6 hours (docs incomplete) | — |
| Wix | resolved | oauth2 | 2 | 5 | 0 | — | 2–6 hours (docs incomplete) | — |
| Wrike | resolved | oauth2 | 7 | 8 | 0 | yes | 1–3 hours | observed |
| X | resolved | oauth2 | 7 | 6 | 0 | — | 2–6 hours (docs incomplete) | — |
| Xero | resolved | unknown | 2 | 4 | 0 | — | Not estimated from current evidence | — |
| YouTube | resolved | oauth2 | 11 | 7 | 3 | — | 1–3 hours | — |
| Zendesk | resolved | oauth2 | 15 | 7 | 6 | — | 1–3 hours | — |
| Zoho CRM | resolved | oauth2 | 4 | 6 | 0 | — | 2–6 hours (docs incomplete) | — |
