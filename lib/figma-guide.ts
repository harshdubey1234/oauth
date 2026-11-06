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

export const figmaGuide: Guide = {
  id: "figma",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Figma",
    domain: "figma.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read design file metadata and comments for an AI design review assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read design file metadata and comments for AI design review",
  summary:
    "Figma implements OAuth 2.0 authorization code flow with granular scopes files:read, file_comments:write, and file_dev_resources:read. Organization administrators on Figma Organization and Enterprise plans can restrict or approve third-party OAuth app installations.",
  assumptions: [
    "The AI design review assistant inspects design hierarchy and existing comments, and writes review feedback directly onto design files via comments.",
    "Testing is carried out on a controlled internal Figma test file inside an organization or team workspace.",
    "The integration uses Figma OAuth 2.0 rather than personal access tokens to support multi-user organizational workflows.",
    "Organization administrators have permitted third-party OAuth apps or are available to approve the application in the Figma Admin Console.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Figma supports standard OAuth 2.0 authorization code flow with granular scopes, refresh tokens, and redirect URIs. The REST API is served at https://api.figma.com/v1/.",
      "figma_oauth",
      "figma_tokens",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Figma OAuth 2.0 comment writing and refresh token rotation in this specific design review scenario was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Implement the Figma OAuth 2.0 authorization code flow requesting files:read, file_comments:write, and file_dev_resources:read scopes. Ensure refresh token exchange logic is active before access tokens expire, and verify organization app policies with the Figma admin.",
    "figma_oauth",
    "figma_tokens",
    "figma_org",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Register an OAuth application in Figma Developer settings, initiate the authorization flow with a test user, and verify file metadata and comments endpoints on a test file. No live API request has been executed in this guide.",
      "figma_oauth",
      "figma_files",
      "unknown",
    ),
    nextAction:
      "Log in to Figma, navigate to Developer settings under your account, and register an OAuth app.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Production deployment in an organization workspace requires Figma organization administrator approval if app restriction policies are active, plus robust handling of refresh token lifecycle and API rate limits.",
      "figma_org",
      "figma_oauth",
      "unknown",
    ),
    nextAction:
      "Check organization third-party app governance policies with your Figma organization admin and deploy automated token refresh handlers.",
  },
  prerequisites: [
    {
      title: "Figma account with team or organization membership",
      owner: "developer",
      detail: c(
        "A Figma account with membership in the target organization or team is required to access developer settings and test files.",
        "figma_oauth",
      ),
    },
    {
      title: "Figma OAuth app registration in Developer settings",
      owner: "developer",
      detail: c(
        "Registering an app in Figma Developer settings generates the Client ID and Client Secret needed for OAuth authorization.",
        "figma_oauth",
      ),
    },
    {
      title: "Controlled Figma test file with sample frames and comments",
      owner: "developer",
      detail: c(
        "A dedicated Figma test file populated with canvas components and comments enables validation without touching production design assets.",
        "figma_files",
        "unknown",
      ),
    },
    {
      title: "Figma organization administrator approval policy review",
      owner: "administrator",
      detail: c(
        "Organization administrators on Figma Organization and Enterprise plans control third-party app installation permissions.",
        "figma_org",
      ),
    },
  ],
  permissions: [
    {
      name: "files:read",
      rationale: c(
        "Allows read-only access to Figma design file metadata, document structure, layers, components, and styles for automated design review.",
        "figma_tokens",
        "figma_files",
      ),
      condition:
        "Required to inspect design canvas content and component hierarchies.",
    },
    {
      name: "file_comments:write",
      rationale: c(
        "Allows the assistant to post design review comments and annotations directly to Figma file threads.",
        "figma_tokens",
        "figma_comments",
      ),
      condition:
        "Required for the assistant to provide interactive in-file design feedback.",
    },
    {
      name: "file_dev_resources:read",
      rationale: c(
        "Allows reading developer resources and code links attached to Figma design components.",
        "figma_tokens",
      ),
      condition:
        "Enables checking design tokens and component implementation links.",
    },
    {
      name: "files:write (excluded)",
      rationale: c(
        "Grants permission to modify file contents and canvas layers. Excluded as review comments do not require canvas modification.",
        "figma_tokens",
      ),
      condition:
        "Excluded to avoid unintentional alterations to design files.",
    },
  ],
  steps: [
    {
      id: "register-figma-app",
      title: "Register an OAuth app in Figma Developer Settings",
      detail: c(
        "Navigate to Figma Settings > Security > Developer settings, click Create new app, and provide the App name, Website URL, and Redirect URI.",
        "figma_oauth",
        "figma_tokens",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://www.figma.com/developers/api#oauth2",
      completion:
        "App registered; Client ID and Client Secret saved securely in server configuration.",
      dependsOn: [],
    },
    {
      id: "check-org-app-policy",
      title: "Check Figma organization third-party app settings",
      detail: c(
        "Verify with organization administrators whether third-party app installations are restricted under Admin settings > Apps, and request allowlisting if needed.",
        "figma_org",
        "unknown",
      ),
      owner: "administrator",
      path: "both",
      completion:
        "Organization app policy verified and allowlisting confirmed.",
      dependsOn: [],
    },
    {
      id: "initiate-user-authorization",
      title: "Initiate OAuth 2.0 user authorization flow",
      detail: c(
        "Redirect user to https://www.figma.com/oauth with client_id, redirect_uri, scope=files:read,file_comments:write,file_dev_resources:read, state, and response_type=code.",
        "figma_oauth",
        "figma_tokens",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://www.figma.com/developers/api#oauth2",
      completion:
        "User approves scopes and Figma redirects with authorization code to callback URL.",
      dependsOn: ["register-figma-app", "check-org-app-policy"],
    },
    {
      id: "exchange-figma-token",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Send POST to https://api.figma.com/v1/oauth/token with client_id, client_secret, redirect_uri, code, and grant_type=authorization_code.",
        "figma_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://www.figma.com/developers/api#oauth2",
      completion:
        "OAuth access_token, refresh_token, and user_id received and stored securely in backend secrets store.",
      dependsOn: ["initiate-user-authorization"],
    },
    {
      id: "fetch-file-metadata",
      title: "Read design file metadata and layers",
      detail: c(
        "Call GET https://api.figma.com/v1/files/{file_key} with Bearer access token to inspect document nodes, frames, and components of the test file.",
        "figma_files",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://www.figma.com/developers/api#files",
      completion:
        "File JSON schema and layer tree successfully parsed by design review assistant.",
      dependsOn: ["exchange-figma-token"],
    },
    {
      id: "fetch-and-post-comments",
      title: "Read existing comments and post test review comment",
      detail: c(
        "Call GET https://api.figma.com/v1/files/{file_key}/comments to list threads, then test POST https://api.figma.com/v1/files/{file_key}/comments with a review comment.",
        "figma_comments",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://www.figma.com/developers/api#comments",
      completion:
        "Comments read and test review feedback posted to target canvas node.",
      dependsOn: ["fetch-file-metadata"],
    },
    {
      id: "refresh-token-lifecycle",
      title: "Implement OAuth refresh token exchange mechanism",
      detail: c(
        "Figma OAuth access tokens expire. Call POST https://api.figma.com/v1/oauth/refresh with client_id, client_secret, and refresh_token to rotate tokens before expiration.",
        "figma_oauth",
        "figma_tokens",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://www.figma.com/developers/api#access-tokens",
      completion:
        "Background token refresh worker operational with proactive rotation.",
      dependsOn: ["exchange-figma-token"],
    },
    {
      id: "handle-figma-rate-limits",
      title: "Handle Figma REST API rate limits and backoff",
      detail: c(
        "Monitor Figma API response headers for rate limiting and implement exponential backoff on HTTP 429 status responses.",
        "figma_files",
        "unknown",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://www.figma.com/developers/api#files",
      completion:
        "API client gracefully throttles queries and avoids rate-limit disruptions.",
      dependsOn: ["fetch-file-metadata"],
    },
  ],
  approvals: [
    {
      title: "Figma user authorization consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing Figma user consents to the requested file read, comment write, and dev resource scopes on the OAuth consent dialog.",
        "figma_oauth",
      ),
    },
    {
      title: "Figma organization app policy approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "In Figma Organization or Enterprise accounts, admins can restrict unapproved apps and must allowlist the app under Admin settings > Apps.",
        "figma_org",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Figma OAuth app setup + file and comment smoke test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Working Figma team account and test design file available; excludes design review AI model integration.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Test design file creation and team permission setup",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Preparing a test Figma file with frames and mock components.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Figma organization admin app allowlisting",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Only applicable if the organization has restricted third-party app installations in admin settings.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "Third-Party App Blocked by Organization Admin",
      recovery: c(
        "Organization administrators on Figma Organization or Enterprise plans can block unapproved apps. Submit the app Client ID to the admin for allowlisting under Admin settings > Apps.",
        "figma_org",
      ),
      owner: "administrator",
    },
    {
      title: "HTTP 403 Forbidden on File or Comments Endpoint",
      recovery: c(
        "Ensure the authorizing user has view permissions on the target file for reading, and can edit/comment to write review comments. Verify the file_comments:write scope was consented.",
        "figma_files",
        "figma_comments",
      ),
      owner: "user",
    },
    {
      title: "Access Token Expired",
      recovery: c(
        "Figma OAuth access tokens expire. Use the stored refresh token to request a new access token via the /v1/oauth/refresh endpoint.",
        "figma_oauth",
        "figma_tokens",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open Figma Developer settings, register an OAuth application, and configure redirect URIs.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "figma_oauth_doc",
      "Figma · REST API OAuth 2.0 Authentication",
      "https://www.figma.com/developers/api#oauth2",
    ),
    source(
      "figma_files_doc",
      "Figma · REST API Files Endpoint",
      "https://www.figma.com/developers/api#files",
    ),
    source(
      "figma_comments_doc",
      "Figma · REST API Comments Endpoint",
      "https://www.figma.com/developers/api#comments",
    ),
    source(
      "figma_tokens_doc",
      "Figma · REST API Access Tokens & Scopes",
      "https://www.figma.com/developers/api#access-tokens",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Figma OAuth 2.0 and comment scopes must be verified.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or organization approval requirement has not been established from official documentation.",
      conditions:
        "Confirm with your Figma organization administrator or admin settings.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for configuration and minimal read test, not an observed execution duration.",
      conditions:
        "Experienced developer with a Figma team or organization account.",
      testId: null,
    },
    {
      id: "figma_oauth",
      kind: "official_docs",
      sourceIds: ["figma_oauth_doc"],
      note: "Figma REST API documentation covers OAuth 2.0 authorization code flow: authorize URL https://www.figma.com/oauth, token exchange POST /v1/oauth/token, and refresh POST /v1/oauth/refresh.",
      conditions:
        "Requires registered client ID and client secret with matching redirect URI.",
      testId: null,
    },
    {
      id: "figma_files",
      kind: "official_docs",
      sourceIds: ["figma_files_doc"],
      note: "The GET /v1/files/:key endpoint returns a JSON tree representing the Figma document structure, layers, components, and styles.",
      conditions:
        "Requires files:read scope and user read permissions on the file.",
      testId: null,
    },
    {
      id: "figma_comments",
      kind: "official_docs",
      sourceIds: ["figma_comments_doc"],
      note: "The comments API allows reading existing comments GET /v1/files/:key/comments and posting new comments POST /v1/files/:key/comments.",
      conditions:
        "Posting comments requires the file_comments:write scope and file comment permissions.",
      testId: null,
    },
    {
      id: "figma_tokens",
      kind: "official_docs",
      sourceIds: ["figma_tokens_doc"],
      note: "Figma documentation details scopes (files:read, file_comments:write, file_dev_resources:read), token expiration lifetimes, and refresh token exchange.",
      conditions:
        "Access tokens must be refreshed proactively using the refresh token endpoint.",
      testId: null,
    },
    {
      id: "figma_org",
      kind: "unverified",
      sourceIds: [],
      note: "Organization-level app governance (whether admins can block or allowlist OAuth apps) was originally cited to a Help Center page that now returns 404. A 7 Nov 2026 recheck found no live page confirming it, so it is kept as an unverified expectation.",
      conditions:
        "Confirm in your Figma Organization or Enterprise admin settings before relying on it.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect Figma REST API OAuth 2.0 flow, files and comments endpoints, access tokens & scopes, and org app management articles.",
      observation:
        "Documentation confirms OAuth 2.0 endpoints, files:read, file_comments:write, and file_dev_resources:read scopes, refresh token rotation, and organization app governance controls.",
      outcome: "observed",
      stoppedAt: "Before authenticated Figma developer app registration.",
      humanNext:
        "Sign in to Figma, open Developer settings, and create a new OAuth app.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Navigate to Figma Developer settings at https://www.figma.com/developers without an active session.",
      observation:
        "Access requires interactive Figma account authentication to register or manage OAuth apps.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in with an authorized Figma account.",
    },
  ],
  unresolvedQuestions: [
    "Does your Figma organization enforce app approval under Admin Settings > Apps, or can members freely connect OAuth apps?",
    "Will the assistant post comments as the authorizing user or under a dedicated Figma bot seat?",
    "Does Composio managed Figma auth support the file_comments:write scope or only read operations?",
  ],
  researchedAt: at,
};
