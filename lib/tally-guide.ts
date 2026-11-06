import type { Claim, Guide } from "./schema";
import receipts from "./tally-sources.json";

const at = receipts.reduce(
  (latest, source) =>
    source.retrievedAt > latest ? source.retrievedAt : latest,
  "",
);
const c = (text: string, ...evidenceIds: string[]): Claim => ({
  text,
  evidenceIds,
});
const docs = (
  id: string,
  sourceIds: string[],
  note: string,
  conditions: string,
): Guide["evidence"][number] => ({
  id,
  kind: "official_docs",
  sourceIds,
  note,
  conditions,
  testId: null,
});

export const tallyGuide: Guide = {
  id: "tally",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: { name: "Tally", domain: "tally.so", identityStatus: "resolved" },
  scenario: {
    actions:
      "Read completed responses from one team intake form and prepare a weekly internal digest, without changing forms or sending messages.",
    audience: "organization",
    stage: "test",
    ownership: "unsure",
  },
  title: "Turn intake responses into a weekly digest",
  summary:
    "An independent pick for agent intake. Start with Tally's hosted MCP OAuth connection; the REST API-key alternative has a broader access boundary than a single form.",
  assumptions: [
    "Independent pick: chosen for a practical intake-to-summary workflow and a distinct authentication tradeoff. This is a product judgment, not a popularity ranking.",
    "The first test uses one existing form, synthetic responses and an account the team controls. The digest is previewed internally; nothing is sent automatically.",
    "OAuth Atlas researches setup requirements. It does not connect to Tally or receive form responses.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Tally documents OAuth for its hosted MCP server. Public discovery advertises authorization-code and refresh-token grants with S256 PKCE. These observations establish a documented route, not a completed authorization.",
      "mcp_auth",
      "oauth_discovery",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Tally's provider-hosted MCP route is documented. Availability of a Composio-managed Tally OAuth app, and its coverage for this scenario, was not established.",
      "mcp_auth",
      "unknown",
    ),
  },
  recommendedPath: c(
    "For a first test, use an OAuth-capable MCP client with https://api.tally.so/mcp. Allow only the reading tools needed by the digest. Use REST only if the backend workflow needs it and the owner accepts the API key's inherited access. A tool allowlist does not narrow the underlying credential.",
    "mcp_auth",
    "key_boundary",
    "plan",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "The public setup path is documented and the API is advertised as free. A human still needs to authorize the chosen client and compare returned synthetic responses with the selected form.",
      "mcp_auth",
      "api_basics",
      "plan",
    ),
    nextAction:
      "Choose an OAuth-capable MCP client and a team-owned test form containing synthetic responses.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "An internal digest still needs an agreed credential owner, data boundary and retention policy. Public metadata exposes a registration endpoint, but customer-app eligibility, scope meanings and any distribution review were not established. A personal test does not establish external launch readiness.",
      "oauth_discovery",
      "unknown",
      "plan",
    ),
    nextAction:
      "Before external distribution, confirm Tally's client-registration policy and per-customer isolation with the provider; record actual consent and data flows.",
  },
  prerequisites: [
    {
      title: "A controlled form and sample responses",
      owner: "user",
      detail: c(
        "Use synthetic intake responses and record the expected completed-response count and date window before testing.",
        "plan",
      ),
    },
    {
      title: "Select the connection owner",
      owner: "administrator",
      detail: c(
        "Confirm the account can access the intended form and review what other resources its credentials could expose.",
        "key_boundary",
        "plan",
      ),
    },
    {
      title: "A compatible client or secure backend",
      owner: "developer",
      detail: c(
        "Choose MCP OAuth for the guided connection, or a server-side REST integration. Keep credentials out of browser code, shared guides and logs.",
        "mcp_auth",
        "plan",
      ),
    },
  ],
  permissions: [
    {
      name: "MCP scope: mcp",
      rationale: c(
        "The protected-resource metadata for /mcp lists mcp as supported and required. It does not describe a read-only or per-form scope.",
        "mcp_scope",
      ),
      condition:
        "For the hosted MCP route; inspect the real authorization screen before consenting.",
    },
    {
      name: "REST API key: inherited user access",
      rationale: c(
        "Tally says API keys inherit their user's permissions across all that user's resources; fine-grained key permissions are not currently offered.",
        "key_boundary",
      ),
      condition:
        "REST alternative only. Selecting one form in code is not a provider-enforced permission boundary.",
    },
    {
      name: "Application capability: read completed responses",
      rationale: c(
        "The submissions endpoint supports a form ID, completion filter and date bounds. Restrict the digest to those reads; exclude creation, editing and publishing tools.",
        "submission_read",
        "plan",
      ),
      condition: "Application policy, not a newly invented OAuth scope.",
    },
  ],
  steps: [
    {
      id: "choose-route",
      title: "Choose MCP OAuth or the REST alternative",
      owner: "developer",
      path: "both",
      dependsOn: [],
      detail: c(
        "Use hosted MCP for an interactive agent connection. Choose REST for a backend job only after assessing the broader API-key access. Document the route and account owner before configuring either.",
        "mcp_auth",
        "key_boundary",
        "plan",
      ),
      completion: "The chosen route, client and credential owner are recorded.",
      sourceUrl: "https://developers.tally.so/api-reference/mcp.md",
    },
    {
      id: "test-boundary",
      title: "Prepare a safe test boundary",
      owner: "user",
      path: "both",
      dependsOn: ["choose-route"],
      detail: c(
        "Pick one form with synthetic responses. Write down its ID, expected completed count, allowed fields and date window. Decide who may see the digest and which fields must be omitted.",
        "plan",
      ),
      completion:
        "A reviewer can inspect the expected input and intended output without real respondent data.",
    },
    {
      id: "authorize",
      title: "Authorize the selected connection",
      owner: "user",
      path: "test",
      dependsOn: ["test-boundary"],
      detail: c(
        "MCP route: add https://api.tally.so/mcp in an OAuth-capable client, follow its connect link, sign in and inspect consent. Let that client manage its callback and PKCE flow. Do not guess a callback URL from this guide. The MCP server is beta.",
        "mcp_auth",
        "oauth_discovery",
      ),
      completion:
        "The client reports an authorized connection; record the actual account and consent separately from this documentation review.",
      sourceUrl: "https://developers.tally.so/api-reference/mcp.md",
    },
    {
      id: "rest-alternative",
      title: "If using REST, provision a key securely",
      owner: "user",
      path: "test",
      dependsOn: ["test-boundary"],
      detail: c(
        "Skip for MCP OAuth. For REST, open Tally Settings > API keys, create a key as the chosen user and store its one-time value in the backend secret store. Record the API version shown there. Never paste the key into troubleshooting.",
        "key_boundary",
        "versioning",
      ),
      completion:
        "For REST, the backend has the secret and version recorded; for MCP, this alternative is explicitly skipped.",
      sourceUrl: "https://developers.tally.so/api-reference/api-keys.md",
    },
    {
      id: "read-responses",
      title: "Read one bounded response set",
      owner: "developer",
      path: "test",
      dependsOn: ["test-boundary"],
      detail: c(
        "After the selected authorization route succeeds, request completed submissions for the chosen form and date interval. REST uses GET /forms/{formId}/submissions with filter=completed, startDate, endDate, page and limit. Follow hasMore through all pages, and deduplicate by submission ID. For MCP, inspect the tools actually exposed rather than assuming a tool name.",
        "submission_read",
        "mcp_auth",
        "plan",
      ),
      completion:
        "Returned IDs and completed count match the synthetic fixture, including a multi-page check; no write operation was invoked.",
      sourceUrl:
        "https://developers.tally.so/api-reference/endpoint/forms/submissions/list.md",
    },
    {
      id: "preview-digest",
      title: "Preview the digest without exposing response links",
      owner: "developer",
      path: "both",
      dependsOn: ["read-responses"],
      detail: c(
        "Summarize only the agreed fields and show the draft to the form owner. The response schema describes previewUrl and pdfUrl as signed links containing an access token without expiry. Exclude those links and raw response payloads from shared output and logs.",
        "response_links",
        "plan",
      ),
      completion:
        "The owner confirms the summary, missing/partial response handling and excluded fields; no message has been sent.",
      sourceUrl:
        "https://developers.tally.so/api-reference/endpoint/forms/submissions/list.md",
    },
    {
      id: "launch-check",
      title: "Resolve launch ownership and distribution",
      owner: "developer",
      path: "launch",
      dependsOn: ["preview-digest"],
      detail: c(
        "Record the real consent flow, credential lifecycle, retention, disconnect behavior and tenant separation. For your own customer-facing OAuth client, verify registration eligibility, redirect rules and scope semantics with Tally before implementing against the advertised registration endpoint. No client was registered during this research.",
        "oauth_discovery",
        "unknown",
        "plan",
      ),
      completion:
        "The responsible owner has documented the applicable provider policy and demonstrated access isolation and disconnection.",
      sourceUrl: "https://api.tally.so/.well-known/oauth-authorization-server",
    },
  ],
  approvals: [
    {
      title: "Account-holder authorization",
      kind: "consent",
      owner: "user",
      detail: c(
        "The MCP connection flow asks the user to log in and authorize. Review the actual access presented by the chosen client.",
        "mcp_auth",
      ),
    },
    {
      title: "Team data and credential ownership",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Have the team owner accept the access boundary and decide which fields may enter the digest. This is an internal project decision; no mandatory Tally administrator-approval policy was established.",
        "plan",
        "unknown",
      ),
    },
    {
      title: "External-client distribution policy",
      kind: "distribution",
      owner: "provider",
      detail: c(
        "Whether a particular customer-facing client needs registration approval or review remains unverified. Discovery metadata alone does not establish eligibility or approval.",
        "oauth_discovery",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Configure and inspect a first test",
      value: "30–60 minutes, planning estimate",
      basis: "estimated",
      assumptions:
        "A compatible client, controlled account, synthetic form and responses already exist. Excludes backend engineering, account creation and approval waiting. No setup duration was observed.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Prepare the test fixture and access",
      value: "Not measured",
      basis: "unknown",
      assumptions:
        "Depends on existing team access, test data and chosen client.",
      evidenceIds: ["unknown"],
    },
  ],
  externalWaiting: [
    {
      label: "Owner consent or external-client confirmation",
      value: "No verified waiting-time estimate",
      basis: "unknown",
      assumptions: "No provider review or authorization request was submitted.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "The key can reach more than one form",
      owner: "administrator",
      recovery: c(
        "Review the selected user's accessible resources before using the REST alternative. If that boundary is unacceptable, stop and agree a suitable account/access design; a form ID in code does not reduce key privileges.",
        "key_boundary",
        "plan",
      ),
    },
    {
      title: "Responses are missing or the digest is incomplete",
      owner: "developer",
      recovery: c(
        "Check the form ID, account access, completion filter, time window and hasMore. Compare submission IDs against the test fixture before summarizing.",
        "submission_read",
        "plan",
      ),
    },
    {
      title: "The API returns 429",
      owner: "developer",
      recovery: c(
        "Tally publishes a 100-requests-per-minute limit. Bound and back off reads; evaluate its documented webhook option if the workflow later needs real-time delivery.",
        "api_basics",
      ),
    },
    {
      title: "Customer-facing OAuth rules remain unclear",
      owner: "provider",
      recovery: c(
        "Ask Tally to confirm the intended client model and scope meanings. The advertised registration endpoint is evidence of discovery, not proof that your product has permission to launch.",
        "oauth_discovery",
        "unknown",
      ),
    },
  ],
  nextAction:
    "Choose an OAuth-capable MCP client and one team-owned form with synthetic responses; review the account's access before authorizing.",
  sources: receipts as Guide["sources"],
  evidence: [
    docs(
      "mcp_auth",
      ["mcp"],
      "The beta hosted MCP server documents OAuth as its recommended connection method, with API-key authentication as an alternative.",
      "Applies to the provider-hosted MCP connection. Actual client compatibility and consent were not tested.",
    ),
    docs(
      "key_boundary",
      ["keys"],
      "API keys belong to the creating user and inherit that user's resource permissions. No fine-grained key permissions are documented.",
      "Applies to API keys, not an assertion about the exact OAuth grant shown by a client.",
    ),
    docs(
      "submission_read",
      ["submissions"],
      "The REST schema documents form-specific, paginated reads with completion and date filters.",
      "Requires an authorized account and valid form ID. Documentation examples are not observed successful calls.",
    ),
    docs(
      "response_links",
      ["submissions"],
      "The response schema marks previewUrl and pdfUrl as token-bearing signed URLs with no expiry.",
      "Treat any such returned URL as sensitive; do not publish real respondent links.",
    ),
    docs(
      "versioning",
      ["version"],
      "A key has a default API version; requests may explicitly select a version using tally-version.",
      "Use a version verified for the actual integration, rather than copying a historical example blindly.",
    ),
    docs(
      "mcp_scope",
      ["resource"],
      "Live MCP resource discovery returned the mcp scope as both supported and required.",
      "Scope name observed publicly. Per-form restrictions and precise grant semantics were not established.",
    ),
    docs(
      "oauth_discovery",
      ["oauth"],
      "Live discovery returned authorization, token and registration endpoints, authorization-code and refresh-token grants, and S256 PKCE.",
      "Read-only GET of metadata only. No registration POST, token request, client eligibility or authenticated connection was tested.",
    ),
    docs(
      "api_basics",
      ["api"],
      "The provider advertises free API access and a 100-request-per-minute rate limit.",
      "Published terms as retrieved; limits may change. Client or downstream processing costs are separate.",
    ),
    {
      id: "plan",
      kind: "estimate",
      sourceIds: [],
      note: "The fixture, read-tool allowlist, privacy checks and launch acceptance criteria are proposed implementation choices for this digest.",
      conditions:
        "Recommendations for this scenario, not provider-mandated controls or observed implementation.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "A planning allowance for a narrow first test, not a measured setup time.",
      conditions:
        "Existing account, synthetic form and compatible client; excludes engineering and external waiting.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "Managed-toolkit coverage, exact OAuth access semantics, custom-client eligibility and distribution review remain unestablished.",
      conditions:
        "Confirm with the selected client, account owner and current provider policy before launch.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "docs-review",
      kind: "documentation_review",
      at,
      action:
        "Retrieved Tally's public MCP, API-key, submissions, versioning and API-help documentation.",
      observation:
        "All selected pages returned HTTP 200. Source records retain retrieval timestamps and SHA-256 hashes.",
      outcome: "observed",
      stoppedAt:
        "Public documentation; no provider account or response data accessed.",
      humanNext: "Prepare a controlled form and authorize the chosen client.",
    },
    {
      id: "discovery-read",
      kind: "entry_point_check",
      at,
      action:
        "GET the public MCP protected-resource and OAuth authorization-server metadata.",
      observation:
        "Both returned HTTP 200 JSON with the MCP scope and OAuth endpoints/capabilities recorded in the evidence.",
      outcome: "observed",
      stoppedAt:
        "Read-only discovery; no app registered, no consent completed, no token obtained.",
      humanNext:
        "Use the supported client flow for a test; confirm custom-client policy before external distribution.",
    },
  ],
  unresolvedQuestions: [
    "Which OAuth-capable MCP client will run the digest, and what access will its actual consent screen grant?",
    "What resources can the selected team account access, and is that boundary acceptable?",
    "Does Composio currently offer a managed Tally OAuth app with the required capabilities?",
    "For an external product, what client-registration eligibility, scope semantics, redirect requirements and review policy apply?",
    "Who owns respondent consent, summary retention, disconnection and deletion in the real workflow?",
  ],
  researchedAt: at,
};
