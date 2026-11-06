import type { Claim, Guide, Source } from "./schema";

const at = "2026-11-06T21:58:04.000Z";
const c = (text: string, ...evidenceIds: string[]): Claim => ({
  text,
  evidenceIds,
});
const source = (id: string, title: string, url: string): Source => ({
  id,
  title,
  url,
  retrievedAt: at,
  retrieval: "page",
  official: true,
});

export const trelloGuide: Guide = {
  id: "trello",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Trello",
    domain: "trello.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read cards and lists from a project board for an AI standup summary",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read project board cards and lists for standup summaries",
  summary:
    "Trello relies on OAuth 1.0a or API key and token pairs rather than OAuth 2.0. Generate developer keys through the Power-Up admin portal and restrict integration tokens to read-only board scopes.",
  assumptions: [
    "The AI standup agent reads board metadata, card names, descriptions, and list placements without modifying or deleting cards.",
    "The initial test is conducted on a dedicated internal project board populated with synthetic task cards inside an organization workspace.",
    "Trello uses OAuth 1.0a (requiring HMAC-SHA1 signed requests) for delegated user authorization, while API key and user token pairs provide a direct alternative for server-side scripts.",
    "Trello accounts operate through Atlassian accounts, and workspace settings may enforce Power-Up or integration permissions.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth1",
    finding: c(
      "Trello implements 3-legged OAuth 1.0a with request token, member authorization, and access token exchange endpoints rather than OAuth 2.0. Direct API key and token parameter authentication is also documented for server workflows.",
      "trello_auth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Trello OAuth 1.0a versus API key/token authentication for this specific read-only standup scenario was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "For user-delegated access, implement the 3-legged OAuth 1.0a flow using the Power-Up API Key as the consumer key and OAuth secret as the consumer secret. For internal automated background jobs with a dedicated bot account, a server-held API key and read-only token pair provides a simpler alternative without request signature overhead.",
    "trello_auth",
    "trello_intro",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Obtain an API key and OAuth secret from the Trello Power-Up admin portal, then issue a read-only token to inspect a controlled test board. No live authorization or API request has been executed in this guide.",
      "trello_auth",
      "unknown",
    ),
    nextAction:
      "Log in to Trello, navigate to trello.com/power-ups/admin, and generate an API key and secret for your integration.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Organization deployment requires workspace administrator approval of third-party integrations, token expiration handling, and enforcement of Trello rate limits (100 requests per 10-second interval per token and 300 per key).",
      "trello_limits",
      "trello_auth",
      "unknown",
    ),
    nextAction:
      "Confirm workspace integration policies with the workspace administrator and implement token rate-limit backoff logic.",
  },
  prerequisites: [
    {
      title: "Atlassian and Trello account with workspace membership",
      owner: "developer",
      detail: c(
        "A valid Trello account with membership in the organization workspace is needed to access developer portals and boards.",
        "trello_intro",
      ),
    },
    {
      title: "Power-Up admin portal registration",
      owner: "developer",
      detail: c(
        "API keys and OAuth secrets are created by registering a new Power-Up integration in the Trello Power-Up admin portal.",
        "trello_auth",
      ),
    },
    {
      title: "Controlled standup test board",
      owner: "administrator",
      detail: c(
        "A test board configured with typical standup lists (e.g., To Do, In Progress, Done) and synthetic task cards prevents leaking sensitive customer boards.",
        "trello_boards",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets storage and OAuth 1.0a signer",
      owner: "developer",
      detail: c(
        "OAuth 1.0a requires HMAC-SHA1 request signing with timestamp and nonce generation. API keys, secrets, and issued tokens must remain secured on the server.",
        "trello_auth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "scope: read",
      rationale: c(
        "Grants read-only access to boards, lists, cards, and organizations accessible by the authorized member. Sufficient to extract all necessary standup summary data.",
        "trello_auth",
        "trello_boards",
      ),
      condition:
        "Requested during OAuth authorization (scope=read); do not request write or account permissions.",
    },
    {
      name: "scope: write (excluded)",
      rationale: c(
        "Grants permission to create, update, or delete cards, lists, and boards. Standup summaries only require reading board state.",
        "trello_auth",
      ),
      condition:
        "Explicitly excluded to uphold the principle of least privilege.",
    },
    {
      name: "scope: account (excluded)",
      rationale: c(
        "Grants access to read and update account-level details including member email addresses. Standup summaries do not require member profile access.",
        "trello_auth",
      ),
      condition:
        "Explicitly excluded to protect user privacy.",
    },
  ],
  steps: [
    {
      id: "get-credentials",
      title: "Generate Trello API key and OAuth secret",
      detail: c(
        "Open the Trello Power-Up admin portal (https://trello.com/power-ups/admin) to generate an API key (used as the OAuth 1.0a consumer key) and an OAuth secret.",
        "trello_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
      completion:
        "API key and OAuth secret generated and saved in secure backend configuration.",
      dependsOn: [],
    },
    {
      id: "select-auth-flow",
      title: "Select OAuth 1.0a vs API key and token flow",
      detail: c(
        "Determine whether the integration needs user-delegated OAuth 1.0a (requiring HMAC-SHA1 signatures and interactive member consent) or a static API key plus token for internal server automation.",
        "trello_auth",
        "trello_intro",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
      completion:
        "Authorization model selected and aligned with security architecture.",
      dependsOn: ["get-credentials"],
    },
    {
      id: "request-token",
      title: "Initiate OAuth 1.0a handshake or token generation",
      detail: c(
        "For OAuth 1.0a, call POST https://trello.com/1/OAuthGetRequestToken signed with HMAC-SHA1 to obtain an unauthorized request token. For manual tokens, prepare the authorization URL with scope=read.",
        "trello_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
      completion:
        "Temporary request token acquired or authorization URL formatted.",
      dependsOn: ["select-auth-flow"],
    },
    {
      id: "authorize-token",
      title: "Prompt user authorization for read-only access",
      detail: c(
        "Redirect the user to https://trello.com/1/OAuthAuthorizeToken with the request token, name, scope=read, and chosen expiration (e.g., expiration=1day or expiration=never).",
        "trello_auth",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
      completion:
        "Member authorizes the application and receives the oauth_verifier code.",
      dependsOn: ["request-token"],
    },
    {
      id: "exchange-access-token",
      title: "Exchange verifier for access token",
      detail: c(
        "Call POST https://trello.com/1/OAuthGetAccessToken with oauth_token and oauth_verifier, signed with consumer secret and token secret, to obtain the permanent access token.",
        "trello_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
      completion:
        "Access token and token secret saved securely in backend secrets store.",
      dependsOn: ["authorize-token"],
    },
    {
      id: "fetch-board-data",
      title: "Fetch cards and lists from the test board",
      detail: c(
        "Call GET https://api.trello.com/1/boards/{id}/lists and GET https://api.trello.com/1/boards/{id}/cards with authenticated credentials to retrieve card titles, descriptions, and list groupings.",
        "trello_boards",
        "trello_intro",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/rest/api-group-boards/",
      completion:
        "Board lists and cards are successfully retrieved and structured for standup summary generation.",
      dependsOn: ["exchange-access-token"],
    },
    {
      id: "rate-limit-handling",
      title: "Implement rate limit handling and request throttling",
      detail: c(
        "Enforce rate limit tracking against Trello limits (100 requests per 10-second interval per token and 300 per key). Check x-rate-limit headers and implement exponential backoff on HTTP 429.",
        "trello_limits",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/",
      completion:
        "API client gracefully respects rate intervals and retries backed-off calls.",
      dependsOn: ["select-auth-flow"],
    },
    {
      id: "workspace-governance",
      title: "Confirm workspace integration policy",
      detail: c(
        "Ensure workspace administrators allow custom Power-Ups and API integrations, and confirm the bot account has read access to required project boards.",
        "trello_intro",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/",
      completion:
        "Workspace policy documented and board permissions approved by workspace admin.",
      dependsOn: ["select-auth-flow"],
    },
  ],
  approvals: [
    {
      title: "Member authorization consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing Trello member must approve access to their boards and cards through the Trello OAuth authorization screen.",
        "trello_auth",
      ),
    },
    {
      title: "Workspace integration approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Workspace administrators may restrict custom Power-Ups or third-party integrations across organizational boards.",
        "trello_intro",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "API key registration + OAuth 1.0a handshake or token read test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has an existing Trello workspace and test board; excludes building production standup summarization models.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Workspace access and test board setup",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Creating a dedicated test board with sample lists and cards for verification.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Workspace administrator integration review",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only if workspace settings enforce administrative approval for custom integrations.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 429 Rate Limit Exceeded",
      recovery: c(
        "Trello limits tokens to 100 requests per 10-second interval and keys to 300 requests per 10-second interval. Implement request throttling, batch list/card queries, and inspect x-rate-limit response headers.",
        "trello_limits",
      ),
      owner: "developer",
    },
    {
      title: "OAuth 1.0a Signature Verification Failure",
      recovery: c(
        "Verify HMAC-SHA1 signature construction, URL parameter encoding, nonce freshness, and accurate pairing of consumer secret and token secret.",
        "trello_auth",
      ),
      owner: "developer",
    },
    {
      title: "Board or List HTTP 401 Unauthorized / 404 Not Found",
      recovery: c(
        "Confirm the authorizing account is a member of the workspace or board and that board ID is accurate. Trello returns 401 or 404 when access is missing.",
        "trello_boards",
        "trello_intro",
      ),
      owner: "administrator",
    },
  ],
  nextAction:
    "Generate an API key and secret in the Trello Power-Up admin portal, then set up a test board with sample cards.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "trello_auth_doc",
      "Trello · REST API Authorization",
      "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
    ),
    source(
      "trello_boards_doc",
      "Trello · Boards API Reference",
      "https://developer.atlassian.com/cloud/trello/rest/api-group-boards/",
    ),
    source(
      "trello_intro_doc",
      "Trello · REST API Introduction",
      "https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/",
    ),
    source(
      "trello_limits_doc",
      "Trello · REST API Rate Limits",
      "https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Trello OAuth 1.0a vs API key tokens must be verified.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or workspace approval requirement has not been established from official documentation.",
      conditions:
        "Confirm with your workspace administrator or provider console.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for configuration and minimal read test, not an observed execution duration.",
      conditions:
        "Experienced developer; working Trello account and test board already available.",
      testId: null,
    },
    {
      id: "trello_auth",
      kind: "official_docs",
      sourceIds: ["trello_auth_doc"],
      note: "Trello documents OAuth 1.0a authorization endpoints (OAuthGetRequestToken, OAuthAuthorizeToken, OAuthGetAccessToken) and user tokens with read, write, and account scopes, plus expiration periods.",
      conditions:
        "OAuth 1.0a requests require HMAC-SHA1 signatures with consumer key, consumer secret, and token secret.",
      testId: null,
    },
    {
      id: "trello_boards",
      kind: "official_docs",
      sourceIds: ["trello_boards_doc"],
      note: "The Boards API provides endpoints to retrieve lists (/1/boards/{id}/lists) and cards (/1/boards/{id}/cards) belonging to a specific board.",
      conditions:
        "Requires token with read access to the target board.",
      testId: null,
    },
    {
      id: "trello_intro",
      kind: "official_docs",
      sourceIds: ["trello_intro_doc"],
      note: "Trello REST API is served at https://api.trello.com/1/. Authentication accepts API key and token via query parameters or OAuth 1.0 headers. Power-Ups represent integrations.",
      conditions:
        "Tokens inherit the permissions of the authorizing Trello member.",
      testId: null,
    },
    {
      id: "trello_limits",
      kind: "official_docs",
      sourceIds: ["trello_limits_doc"],
      note: "Trello enforces rate limits of 100 requests per 10-second interval per token and 300 requests per 10-second interval per API key, returning HTTP 429 when breached.",
      conditions:
        "Applications must monitor rate limit headers and handle 429 status codes.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Trello REST API authorization, boards endpoints, and rate limit documentation.",
      observation:
        "Documentation establishes OAuth 1.0a endpoints, API key and token mechanics, read/write/account scopes, and 100 req/10s token rate limits. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Trello and create an integration in the Power-Up admin portal.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Trello Power-Up admin portal at https://trello.com/power-ups/admin without credentials.",
      observation:
        "Access requires interactive Atlassian account authentication to view or generate API keys and OAuth secrets.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Atlassian/Trello account and generate developer credentials.",
    },
  ],
  unresolvedQuestions: [
    "Does your organization workspace restrict member-created custom Power-Ups or API tokens?",
    "Will your production standup agent use a dedicated bot account (API key + permanent token) or per-user OAuth 1.0a delegation?",
    "Does Composio's managed Trello toolkit support the OAuth 1.0a flow or only static API key and token pairs?",
  ],
  researchedAt: at,
};
