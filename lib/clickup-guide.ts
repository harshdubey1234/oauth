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

export const clickupGuide: Guide = {
  id: "clickup",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "ClickUp",
    domain: "clickup.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Read tasks and spaces from a workspace for an AI project dashboard",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read workspace tasks and spaces for project dashboard",
  summary:
    "ClickUp uses OAuth 2.0 authorization code flow without granular permission scopes. An authorized token inherits the full workspace access permissions of the authorizing user. API v2 enforces a strict rate limit of 100 requests per minute per OAuth token.",
  assumptions: [
    "The AI dashboard reads spaces, lists, and task metadata without creating, updating, or deleting workspace items.",
    "Testing is performed in a dedicated ClickUp workspace populated with synthetic tasks.",
    "Because ClickUp lacks read-only OAuth scopes, the authorizing user account or dedicated bot member must have appropriate workspace role permissions to restrict blast radius.",
    "The integration must handle the 100 requests per minute per OAuth access token rate limit with client-side throttling and caching.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "ClickUp implements OAuth 2.0 authorization code flow. Unlike many platforms, ClickUp does not support granular permission scopes; authorized tokens inherit the user's full workspace access.",
      "clickup_auth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for ClickUp workspace selection and rate limit handling in this dashboard scenario was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Implement the ClickUp OAuth 2.0 authorization code flow using a dedicated bot or service user with restricted guest/member permissions on the workspace, mitigating the blast radius caused by the absence of granular read-only scopes.",
    "clickup_auth",
    "teams_ref",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create an OAuth app in ClickUp Workspace Integrations, authorize a test user to obtain an access token, and query the Get Authorized Teams and Get Tasks endpoints. No live request has been executed in this guide.",
      "clickup_auth",
      "teams_ref",
      "unknown",
    ),
    nextAction:
      "Log in to ClickUp, navigate to Workspace Settings > Integrations > ClickUp API, and create a new OAuth app.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Production deployment requires workspace owner approval of third-party integrations, enforcement of the 100 requests/minute per token rate limit, and role-based access scoping for the authorizing account.",
      "clickup_auth",
      "clickup_limits",
      "unknown",
    ),
    nextAction:
      "Confirm workspace integration policy with the workspace owner and implement request rate-limiting with exponential backoff.",
  },
  prerequisites: [
    {
      title: "ClickUp account and workspace with developer access",
      owner: "developer",
      detail: c(
        "A valid ClickUp account and membership in a workspace with permissions to configure integrations is required to create OAuth apps.",
        "clickup_auth",
      ),
    },
    {
      title: "ClickUp OAuth app registration",
      owner: "developer",
      detail: c(
        "An application registered in ClickUp Settings > Integrations > ClickUp API provides the Client ID and Client Secret.",
        "clickup_auth",
      ),
    },
    {
      title: "Dedicated restricted bot member account (recommended)",
      owner: "administrator",
      detail: c(
        "Because ClickUp lacks read-only scopes, creating a bot account restricted to only target spaces prevents exposing sensitive unrelated workspace folders.",
        "clickup_auth",
        "unknown",
      ),
    },
    {
      title: "Backend OAuth callback endpoint and secrets manager",
      owner: "developer",
      detail: c(
        "A secure backend endpoint to handle the redirect code exchange and persist permanent access tokens safely.",
        "clickup_auth",
      ),
    },
  ],
  permissions: [
    {
      name: "Workspace User Authority (Inherited)",
      rationale: c(
        "ClickUp does not implement granular OAuth scopes. The issued OAuth access token inherits all read and write permissions held by the authorizing user across the authorized workspace.",
        "clickup_auth",
      ),
      condition:
        "Inherited from authorizing member. Recommend using a dedicated service/bot user with restricted member permissions to prevent unintentional writes.",
    },
    {
      name: "Read-only Scope (Unavailable in ClickUp)",
      rationale: c(
        "ClickUp OAuth lacks granular scope restrictions such as tasks:read. The application must enforce read-only discipline at the code level.",
        "clickup_auth",
      ),
      condition:
        "Design constraint of the ClickUp OAuth 2.0 platform.",
    },
  ],
  steps: [
    {
      id: "create-clickup-oauth-app",
      title: "Create an OAuth app in ClickUp Workspace Settings",
      detail: c(
        "Navigate to ClickUp Settings > Integrations > ClickUp API, and click Create App. Enter the App Name and Authorized Redirect URL.",
        "clickup_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://clickup.com/api/developer-portal/authentication/",
      completion:
        "App created; Client ID and Client Secret generated and saved in secure backend config.",
      dependsOn: [],
    },
    {
      id: "review-member-roles",
      title: "Set up dedicated workspace bot member role",
      detail: c(
        "Because ClickUp tokens inherit full user permissions, create a dedicated bot user in the workspace with restricted access to only dashboard-relevant spaces.",
        "clickup_auth",
        "unknown",
      ),
      owner: "administrator",
      path: "both",
      sourceUrl:
        "https://clickup.com/api/developer-portal/authentication/",
      completion:
        "Bot account created with least-privilege space access.",
      dependsOn: [],
    },
    {
      id: "redirect-user-authorization",
      title: "Redirect user to ClickUp authorization endpoint",
      detail: c(
        "Direct the authorizing user to https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}. The user selects which workspace to authorize.",
        "clickup_auth",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://clickup.com/api/developer-portal/authentication/",
      completion:
        "User authorizes workspace and ClickUp redirects to callback URL with authorization code.",
      dependsOn: ["create-clickup-oauth-app", "review-member-roles"],
    },
    {
      id: "exchange-clickup-token",
      title: "Exchange authorization code for access token",
      detail: c(
        "Send POST request to https://api.clickup.com/api/v2/oauth/token with client_id, client_secret, and code. ClickUp returns an access_token without an expiration date.",
        "clickup_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://clickup.com/api/developer-portal/authentication/",
      completion:
        "Access token received and stored securely in server secrets store.",
      dependsOn: ["redirect-user-authorization"],
    },
    {
      id: "fetch-authorized-teams",
      title: "Retrieve authorized workspaces (teams)",
      detail: c(
        "Call GET https://api.clickup.com/api/v2/team with the Bearer access token to obtain the list of authorized workspace IDs and names.",
        "teams_ref",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://clickup.com/api/clickupreference/operation/GetAuthorizedTeams/",
      completion:
        "Authorized workspace IDs retrieved and verified.",
      dependsOn: ["exchange-clickup-token"],
    },
    {
      id: "fetch-workspace-tasks",
      title: "Retrieve tasks and spaces from authorized workspace",
      detail: c(
        "Call GET https://api.clickup.com/api/v2/team/{team_id}/task or space endpoints to inspect task titles, statuses, and assignees for the dashboard.",
        "tasks_ref",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://clickup.com/api/clickupreference/operation/GetTasks/",
      completion:
        "Task data successfully retrieved and parsed by project dashboard service.",
      dependsOn: ["fetch-authorized-teams"],
    },
    {
      id: "implement-rate-limiting",
      title: "Implement client-side throttling for 100 req/min rate limit",
      detail: c(
        "Enforce client-side rate limiting to stay within ClickUp's 100 requests per minute per token limit. Inspect X-RateLimit headers and implement backoff on HTTP 429.",
        "clickup_limits",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://clickup.com/api/developer-portal/trytheapi/",
      completion:
        "Rate limiter and caching layer prevent 429 throttle events.",
      dependsOn: ["fetch-workspace-tasks"],
    },
    {
      id: "workspace-governance",
      title: "Establish workspace integration and security review",
      detail: c(
        "Document third-party app governance with workspace owners and verify that token revocation procedures are tested in ClickUp settings.",
        "clickup_auth",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://clickup.com/api/developer-portal/authentication/",
      completion:
        "Workspace admin approves integration and documents token lifecycle.",
      dependsOn: ["review-member-roles"],
    },
  ],
  approvals: [
    {
      title: "Workspace member authorization",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing ClickUp member approves the application and selects the workspace to grant access during OAuth flow.",
        "clickup_auth",
      ),
    },
    {
      title: "Workspace admin integration approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Workspace owner or administrator may need to approve custom integrations or permit API access in Enterprise workspaces.",
        "clickup_auth",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "ClickUp OAuth app registration + task read smoke test",
      value: "30–60 minutes",
      basis: "estimated",
      assumptions:
        "Existing ClickUp workspace and developer permissions; excludes dashboard UI development.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Test workspace setup and bot user provisioning",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Creating test spaces, sample tasks, and a restricted member account.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Workspace owner integration approval",
      value: "Unknown; workspace-dependent",
      basis: "unknown",
      assumptions:
        "Only if organizational policies require administrative review of new integrations.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 429 Rate Limit Exceeded",
      recovery: c(
        "ClickUp limits OAuth tokens to 100 requests per minute. Implement batch querying, task caching, and honor X-RateLimit-Reset headers on HTTP 429.",
        "clickup_limits",
      ),
      owner: "developer",
    },
    {
      title: "Excessive Permission Exposure Due to Lack of Scopes",
      recovery: c(
        "Because ClickUp tokens inherit full user permissions, authorizing an owner or admin account exposes all private lists. Re-authorize using a dedicated service account restricted to target spaces.",
        "clickup_auth",
        "unknown",
      ),
      owner: "administrator",
    },
    {
      title: "Oauth code already used or invalid redirect_uri",
      recovery: c(
        "Authorization codes are single-use. Ensure redirect_uri in the token exchange POST exactly matches the registered app redirect URI.",
        "clickup_auth",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open ClickUp Workspace Settings > Integrations > ClickUp API and create an OAuth application.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "clickup_auth_doc",
      "ClickUp · Developer Portal Authentication",
      "https://clickup.com/api/developer-portal/authentication/",
    ),
    source(
      "get_teams_doc",
      "ClickUp API Reference · Get Authorized Teams (Workspaces)",
      "https://clickup.com/api/clickupreference/operation/GetAuthorizedTeams/",
    ),
    source(
      "get_tasks_doc",
      "ClickUp API Reference · Get Tasks",
      "https://clickup.com/api/clickupreference/operation/GetTasks/",
    ),
    source(
      "try_api_doc",
      "ClickUp · Developer Portal Try the API & Rate Limits",
      "https://clickup.com/api/developer-portal/trytheapi/",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for ClickUp workspace selection and rate limit handling must be verified.",
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
        "Experienced developer with a ClickUp workspace and developer app access.",
      testId: null,
    },
    {
      id: "clickup_auth",
      kind: "official_docs",
      sourceIds: ["clickup_auth_doc"],
      note: "ClickUp Developer Portal Authentication docs specify OAuth 2.0 authorization code flow (https://app.clickup.com/api authorize URL and POST /api/v2/oauth/token), noting that tokens do not use scopes and inherit user access.",
      conditions:
        "Access tokens inherit all permissions of the authorizing user in the selected workspace.",
      testId: null,
    },
    {
      id: "teams_ref",
      kind: "official_docs",
      sourceIds: ["get_teams_doc"],
      note: "The Get Authorized Teams endpoint GET /api/v2/team returns the workspaces (teams) that the authenticated user and token have access to.",
      conditions:
        "Requires Bearer token authorization.",
      testId: null,
    },
    {
      id: "tasks_ref",
      kind: "official_docs",
      sourceIds: ["get_tasks_doc"],
      note: "The Get Tasks operation returns tasks filtered by team, space, folder, or list with support for statuses and assignees.",
      conditions:
        "Requires token with access to the specified workspace entity.",
      testId: null,
    },
    {
      id: "clickup_limits",
      kind: "official_docs",
      sourceIds: ["try_api_doc"],
      note: "ClickUp documentation specifies a rate limit of 100 requests per minute per OAuth access token, returning HTTP 429 when exceeded with X-RateLimit headers.",
      conditions:
        "Clients must throttle calls to stay within the 100 req/min quota.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect ClickUp developer portal authentication, get authorized teams, get tasks API, and rate limit docs.",
      observation:
        "Confirmed OAuth 2.0 authorization code flow with no granular scopes, permanent access token model, and 100 req/min token rate limit.",
      outcome: "observed",
      stoppedAt: "Before authenticated app creation in ClickUp workspace.",
      humanNext:
        "Sign in to ClickUp and create an OAuth app in workspace settings.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request ClickUp OAuth authorization endpoint https://app.clickup.com/api without client_id parameter.",
      observation:
        "Endpoint responds with an error or redirects to login, requiring a valid registered client_id and authenticated ClickUp user session.",
      outcome: "blocked",
      stoppedAt: "Interactive ClickUp authentication gate.",
      humanNext:
        "Register an application in ClickUp settings and sign in with authorized credentials.",
    },
  ],
  unresolvedQuestions: [
    "Will your organization mandate a dedicated service account for ClickUp to limit blast radius given the absence of granular scopes?",
    "Will the 100 req/min rate limit support your dashboard polling frequency, or are webhooks required for event-driven updates?",
    "Does Composio managed auth for ClickUp support workspace team selection and automatic token storage?",
  ],
  researchedAt: at,
};
