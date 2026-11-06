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

export const airtableGuide: Guide = {
  id: "airtable",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Airtable",
    domain: "airtable.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Read records from a shared base for an AI data summarizer",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read records from a shared base for an AI data summarizer",
  summary:
    "Airtable mandates OAuth 2.0 with PKCE (Proof Key for Code Exchange) using SHA-256 challenges. Configure granular read scopes (data.records:read, schema.bases:read), grant access to targeted shared bases during user consent, and manage 1-hour access token refreshes alongside the 5 req/s per-base rate limit.",
  assumptions: [
    "The AI data summarizer reads base schema and records from a designated organizational Airtable base.",
    "Airtable OAuth integrations require PKCE (RFC 7636) with the S256 code challenge method.",
    "Access tokens expire after 1 hour (3600 seconds) and must be renewed using refresh tokens.",
    "API requests must not exceed the rate limit of 5 requests per second per base.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Airtable implements OAuth 2.0 authorization code flow with mandatory PKCE (S256), short-lived access tokens (1 hour), and refresh tokens for delegated access to bases and records.",
      "airtable_oauth",
      "airtable_scopes",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Airtable's granular base-selection grants and PKCE token refresh workflows was not established in this research.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Register a confidential or public OAuth integration in Airtable Developer Hub. Implement authorization code exchange with SHA-256 PKCE, request data.records:read and schema.bases:read scopes, and automate token refresh via https://airtable.com/oauth2/v1/token.",
    "airtable_oauth",
    "airtable_scopes",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Register an OAuth integration in the Airtable Developer Hub, implement PKCE challenge generation, and authorize access to a single test base with synthetic records. No live connection has been executed in this guide.",
      "airtable_oauth",
      "unknown",
    ),
    nextAction:
      "Open the Airtable Developer Hub at https://airtable.com/create/oauth and register an OAuth integration.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Organization deployment requires workspace administrator approval for third-party integrations, robust 60-minute token refresh cycling, and per-base rate limit throttling at 5 requests per second.",
      "airtable_oauth",
      "airtable_records",
      "unknown",
    ),
    nextAction:
      "Verify organizational third-party app governance with your Airtable workspace administrator and implement token refresh and rate-limiting middleware.",
  },
  prerequisites: [
    {
      title: "Airtable account with Developer Hub access",
      owner: "developer",
      detail: c(
        "A valid Airtable user account with access to the Developer Hub is required to register OAuth integrations.",
        "airtable_oauth",
      ),
    },
    {
      title: "Controlled shared base with sample records",
      owner: "administrator",
      detail: c(
        "A dedicated organizational base populated with sample tables, fields, and records allows safe testing without exposing sensitive production tables.",
        "airtable_records",
        "unknown",
      ),
    },
    {
      title: "PKCE cryptographic helper and secure token store",
      owner: "developer",
      detail: c(
        "Backend infrastructure must support SHA-256 base64url PKCE challenge generation and securely store encrypted access and refresh tokens.",
        "airtable_oauth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "data.records:read",
      rationale: c(
        "Allows reading table records, cell values, and field data in the shared base for summary generation.",
        "airtable_scopes",
        "airtable_records",
      ),
      condition:
        "Requested during OAuth consent; essential for reading table record contents.",
    },
    {
      name: "schema.bases:read",
      rationale: c(
        "Allows inspecting table names, field definitions, and schema structures to correctly parse records before summarization.",
        "airtable_scopes",
      ),
      condition:
        "Requested during OAuth consent; allows discovering base structure dynamically.",
    },
    {
      name: "data.records:write (excluded)",
      rationale: c(
        "Allows creating, editing, and deleting records. The AI summarizer is strictly read-only and explicitly omits write scopes.",
        "airtable_scopes",
      ),
      condition:
        "Excluded to enforce least privilege and safeguard base records from modification.",
    },
    {
      name: "schema.bases:write (excluded)",
      rationale: c(
        "Allows altering base structure, adding or deleting fields and tables. Excluded for read-only summarization.",
        "airtable_scopes",
      ),
      condition:
        "Excluded to prevent unintended modifications to base architecture.",
    },
  ],
  steps: [
    {
      id: "register-oauth-integration",
      title: "Register OAuth integration in Airtable Developer Hub",
      detail: c(
        "Navigate to https://airtable.com/create/oauth to create an integration, specify your redirect URI, and select data.records:read and schema.bases:read scopes.",
        "airtable_oauth",
        "airtable_scopes",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "Integration registered; client ID and client secret (for confidential clients) recorded.",
      dependsOn: [],
    },
    {
      id: "generate-pkce",
      title: "Generate PKCE code verifier and code challenge",
      detail: c(
        "Generate a high-entropy code_verifier string (43–128 characters) and compute its SHA-256 base64url-encoded code_challenge with code_challenge_method=S256.",
        "airtable_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "code_verifier stored in secure temporary session and code_challenge computed.",
      dependsOn: ["register-oauth-integration"],
    },
    {
      id: "initiate-authorization",
      title: "Redirect user to Airtable authorization endpoint",
      detail: c(
        "Construct the authorization URL to https://airtable.com/oauth2/v1/authorize with client_id, redirect_uri, scope, state, code_challenge, and code_challenge_method=S256.",
        "airtable_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "User is directed to the Airtable authorization screen with PKCE parameters.",
      dependsOn: ["generate-pkce"],
    },
    {
      id: "user-select-bases",
      title: "Authorize integration and select shared base",
      detail: c(
        "The user signs in to Airtable, selects the specific workspace or shared base granted to the app, and authorizes requested read scopes.",
        "airtable_oauth",
        "airtable_scopes",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "User approves access; browser redirects to the callback with an authorization code and matching state.",
      dependsOn: ["initiate-authorization"],
    },
    {
      id: "exchange-pkce-tokens",
      title: "Exchange authorization code and PKCE verifier for tokens",
      detail: c(
        "Send a POST request to https://airtable.com/oauth2/v1/token with code, code_verifier, redirect_uri, and client credentials to receive access and refresh tokens.",
        "airtable_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "Short-lived access token (expires in 3600 seconds) and refresh token secured in backend store.",
      dependsOn: ["user-select-bases"],
    },
    {
      id: "fetch-records",
      title: "Inspect base schema and list records",
      detail: c(
        "Call GET https://api.airtable.com/v0/{baseId}/{tableIdOrName} using Bearer token authentication to retrieve records and verify data reading.",
        "airtable_records",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://airtable.com/developers/web/api/list-records",
      completion:
        "Base records are retrieved, paginated, and processed for summarization.",
      dependsOn: ["exchange-pkce-tokens"],
    },
    {
      id: "token-refresh-service",
      title: "Implement automatic token refresh routine",
      detail: c(
        "Automate token renewal by calling POST https://airtable.com/oauth2/v1/token with grant_type=refresh_token before the 60-minute access token expiry.",
        "airtable_oauth",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "Token refresh scheduler keeps tokens valid continuously without manual reauthorization.",
      dependsOn: ["exchange-pkce-tokens"],
    },
    {
      id: "rate-limit-throttler",
      title: "Implement per-base rate limit throttling",
      detail: c(
        "Implement a client-side request queue enforcing a maximum of 5 requests per second per base and handling HTTP 429 with exponential backoff.",
        "airtable_records",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://airtable.com/developers/web/api/oauth-reference",
      completion:
        "Request queue maintains rate limits strictly under 5 req/s per base.",
      dependsOn: ["register-oauth-integration"],
    },
  ],
  approvals: [
    {
      title: "User base selection consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing user must explicitly select which workspace or specific bases the integration is permitted to access during OAuth authorization.",
        "airtable_oauth",
        "airtable_scopes",
      ),
    },
    {
      title: "Workspace integration governance",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Enterprise and organization administrators may restrict third-party OAuth integrations on corporate Airtable workspaces.",
        "airtable_oauth",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Airtable PKCE integration setup and record query test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has access to an Airtable account, test base, and backend server capable of SHA-256 PKCE generation.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Shared base creation and sample data population",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Configuring a dedicated test base with representative tables, fields, and records for verification.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Workspace admin OAuth approval",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Required only if organizational workspace policies enforce administrative pre-approval of third-party apps.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "Base Not Authorized (HTTP 404 / 403 on base)",
      recovery: c(
        "Airtable requires users to explicitly select which bases the app can access during authorization. If the shared base was omitted, prompt reauthorization with base selection.",
        "airtable_oauth",
        "airtable_scopes",
      ),
      owner: "user",
    },
    {
      title: "HTTP 429 Rate Limit Exceeded (5 req/s limit)",
      recovery: c(
        "Airtable throttles traffic at 5 requests per second per base. Implement a client-side rate limiter and retry with exponential backoff when receiving HTTP 429.",
        "airtable_records",
      ),
      owner: "developer",
    },
    {
      title: "Expired Access Token (HTTP 401)",
      recovery: c(
        "Airtable access tokens expire in 60 minutes. Use the refresh token at https://airtable.com/oauth2/v1/token to obtain fresh access tokens before making API requests.",
        "airtable_oauth",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open the Airtable Developer Hub at https://airtable.com/create/oauth and register an OAuth integration.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "airtable_oauth_doc",
      "Airtable · OAuth Reference",
      "https://airtable.com/developers/web/api/oauth-reference",
    ),
    source(
      "airtable_pat_doc",
      "Airtable · Personal Access Tokens & Service Accounts",
      "https://airtable.com/developers/web/guides/personal-access-tokens",
    ),
    source(
      "airtable_records_doc",
      "Airtable · List Records API",
      "https://airtable.com/developers/web/api/list-records",
    ),
    source(
      "airtable_scopes_doc",
      "Airtable · Web API Scopes",
      "https://airtable.com/developers/web/api/scopes",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Airtable PKCE flows and per-base selection must be verified before choosing managed auth.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or workspace governance rule has not been established from official documentation.",
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
        "Experienced developer; working Airtable account and test base already available.",
      testId: null,
    },
    {
      id: "airtable_oauth",
      kind: "official_docs",
      sourceIds: ["airtable_oauth_doc"],
      note: "Airtable requires OAuth 2.0 with PKCE (RFC 7636) using code_challenge and code_verifier with S256 method. Access tokens expire after 60 minutes and refresh tokens expire after 60 days of non-use.",
      conditions:
        "App must be registered in the Airtable Developer Hub.",
      testId: null,
    },
    {
      id: "airtable_scopes",
      kind: "official_docs",
      sourceIds: ["airtable_scopes_doc"],
      note: "Airtable enforces granular scopes: data.records:read for reading record contents and schema.bases:read for reading base tables and schemas. Users select specific bases to authorize during consent.",
      conditions:
        "Scopes must be requested during the authorization step and matched to intended API operations.",
      testId: null,
    },
    {
      id: "airtable_records",
      kind: "official_docs",
      sourceIds: ["airtable_records_doc"],
      note: "Airtable REST API is hosted at https://api.airtable.com/v0/. Record listing endpoints support pagination with offset and return records up to 100 per request. Rate limit is 5 requests per second per base.",
      conditions:
        "Requires a valid Bearer token and the base must have been granted to the token during authorization.",
      testId: null,
    },
    {
      id: "airtable_pats",
      kind: "official_docs",
      sourceIds: ["airtable_pat_doc"],
      note: "Airtable supports personal access tokens and service accounts for internal automation, while OAuth integrations provide delegated access across organization members.",
      conditions:
        "Personal tokens are bound to a single user, whereas OAuth allows scoped delegation.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Airtable OAuth reference, scopes, list records, and rate limit documentation.",
      observation:
        "Documentation establishes PKCE requirements (S256), granular scopes (data.records:read, schema.bases:read), 60-minute token expiry, and the 5 req/s per-base rate limit. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Airtable and create an OAuth integration in the Developer Hub.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Airtable Developer Hub at https://airtable.com/create/oauth without credentials.",
      observation:
        "Access requires interactive Airtable account authentication to create or manage OAuth integrations.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Airtable account and register developer credentials.",
    },
  ],
  unresolvedQuestions: [
    "Does your Airtable workspace plan require enterprise administrator pre-approval for OAuth integrations?",
    "Will the summarizer need webhooks for continuous incremental updates or scheduled polling via list-records?",
    "Does Composio's managed Airtable integration support per-base granular OAuth grants or static personal access tokens?",
  ],
  researchedAt: at,
};
