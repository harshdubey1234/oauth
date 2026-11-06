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

export const asanaGuide: Guide = {
  id: "asana",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Asana",
    domain: "asana.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read tasks and projects from a team workspace for an AI progress tracker",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read tasks and projects for an AI progress tracker in Asana",
  summary:
    "Asana implements OAuth 2.0 Authorization Code Grant, but notably lacks granular functional scopes. An authorized token inherits the full workspace read and write permissions of the authorizing user across all accessible projects and tasks. Enforce read-only boundaries at the application level and respect Asana's 1,500 req/min rate limit.",
  assumptions: [
    "The AI progress tracker reads project hierarchies, task statuses, assignees, and completion dates without creating, modifying, or deleting tasks.",
    "Initial testing runs on a dedicated team workspace or portfolio populated with sample tasks and milestones.",
    "Asana does not support granular scopes; OAuth tokens receive full user-equivalent access ('default' scope), requiring strict server-side self-restraint.",
    "Personal Access Tokens (PATs) provide an alternative for internal development and single-user testing without running an OAuth redirect server.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Asana supports OAuth 2.0 Authorization Code Grant with authorization at https://app.asana.com/-/oauth_authorize and token exchange at https://app.asana.com/-/oauth_token. Personal Access Tokens are also supported for direct developer scripting.",
      "asana_oauth",
      "asana_pat",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Asana OAuth 2.0 tokens and full-user scope handling for this progress tracking scenario was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "For multi-user organization deployment, implement the OAuth 2.0 Authorization Code flow with refresh token rotation. Because Asana tokens inherit complete user read and write permissions, design internal API client wrappers that restrict calls strictly to GET /projects and GET /tasks.",
    "asana_oauth",
    "asana_tasks",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Register an app in Asana Developer App Management, obtain client credentials, and execute a sample GET /tasks request against a controlled test project. No live connection was executed in this guide.",
      "asana_oauth",
      "asana_tasks",
      "unknown",
    ),
    nextAction:
      "Navigate to app.asana.com/0/developer-console and register a new OAuth app with authorized redirect URIs.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Organizational deployment requires workspace administrator approval of third-party apps in Asana Enterprise/Business admin consoles, token refresh automation, and rate limit handling for Asana's 1,500 req/min budget.",
      "asana_oauth",
      "asana_limits",
      "unknown",
    ),
    nextAction:
      "Verify organization app authorization rules with workspace admins and implement rate limiting with backoff.",
  },
  prerequisites: [
    {
      title: "Asana workspace account and developer console access",
      owner: "developer",
      detail: c(
        "An active Asana account with membership in an organization or workspace where developer app creation is permitted.",
        "asana_oauth",
      ),
    },
    {
      title: "Dedicated test project and tasks",
      owner: "administrator",
      detail: c(
        "A test project populated with synthetic tasks and milestone dates to safely verify task extraction without accessing sensitive company roadmaps.",
        "asana_tasks",
        "unknown",
      ),
    },
    {
      title: "Secure server-side token storage and refresh worker",
      owner: "developer",
      detail: c(
        "Asana access tokens expire after one hour; backend infrastructure must securely store client secrets and refresh tokens, performing automated token refreshes.",
        "asana_oauth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "scope: default (full user-level access)",
      rationale: c(
        "Asana does not offer granular functional scopes (such as read-only vs write). An authorized token inherits the full workspace read and write permissions of the authorizing user.",
        "asana_oauth",
      ),
      condition:
        "Inherent to Asana's OAuth architecture; backend application logic must restrict calls to read-only endpoints.",
    },
    {
      name: "alternative: Personal Access Token (PAT)",
      rationale: c(
        "For internal developer testing or service bots, a Personal Access Token can be generated directly in the developer console without OAuth redirection.",
        "asana_pat",
      ),
      condition:
        "Suitable only for local development or single-user service testing; manually revocable.",
    },
  ],
  steps: [
    {
      id: "register-asana-app",
      title: "Register application in Asana Developer App Management",
      detail: c(
        "Open https://app.asana.com/0/developer-console, create a new application, and configure application name and secure HTTPS redirect URIs.",
        "asana_oauth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl: "https://developers.asana.com/docs/oauth",
      completion:
        "OAuth application created with Client ID and Client Secret saved securely.",
      dependsOn: [],
    },
    {
      id: "select-auth-grant",
      title: "Choose OAuth 2.0 vs Personal Access Token for testing",
      detail: c(
        "Select whether to use interactive OAuth 2.0 Authorization Code Grant or generate a Personal Access Token for initial development verification.",
        "asana_oauth",
        "asana_pat",
      ),
      owner: "developer",
      path: "both",
      sourceUrl: "https://developers.asana.com/docs/oauth",
      completion:
        "Authentication path selected and client configuration initialized.",
      dependsOn: ["register-asana-app"],
    },
    {
      id: "redirect-user-auth",
      title: "Prompt user authorization for Asana workspace access",
      detail: c(
        "Redirect the user to https://app.asana.com/-/oauth_authorize with client_id, redirect_uri, response_type=code, and state parameter.",
        "asana_oauth",
      ),
      owner: "user",
      path: "test",
      sourceUrl: "https://developers.asana.com/docs/oauth",
      completion:
        "User approves authorization and Asana redirects to callback with authorization code.",
      dependsOn: ["select-auth-grant"],
    },
    {
      id: "exchange-asana-token",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Send POST https://app.asana.com/-/oauth_token with grant_type=authorization_code, client_id, client_secret, redirect_uri, and code to receive access_token and refresh_token.",
        "asana_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.asana.com/docs/oauth",
      completion:
        "Access token (1-hour validity) and refresh token saved in encrypted server vault.",
      dependsOn: ["redirect-user-auth"],
    },
    {
      id: "fetch-tasks-projects",
      title: "Retrieve tasks and projects from Asana REST API",
      detail: c(
        "Call GET https://app.asana.com/api/1.0/projects and GET https://app.asana.com/api/1.0/tasks?project={project_gid}&opt_fields=name,completed,due_on,assignee with Authorization: Bearer <token>.",
        "asana_tasks",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.asana.com/docs/tasks",
      completion:
        "Project task list and progress metadata successfully retrieved.",
      dependsOn: ["exchange-asana-token"],
    },
    {
      id: "implement-rate-limiting",
      title: "Implement rate limit handling for 1,500 req/min budget",
      detail: c(
        "Asana enforces a rate limit of 1,500 requests per minute. Track call frequency, inspect Retry-After headers when receiving HTTP 429, and use opt_fields to reduce round-trips.",
        "asana_limits",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl: "https://developers.asana.com/docs/rate-limits",
      completion:
        "Client rate limiter configured with request throttling and exponential backoff.",
      dependsOn: ["select-auth-grant"],
    },
    {
      id: "workspace-admin-governance",
      title: "Confirm organization workspace app authorization policy",
      detail: c(
        "Review Asana admin console security settings to ensure enterprise administrators have approved third-party integration installations across workspace teams.",
        "asana_oauth",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl: "https://developers.asana.com/docs/oauth",
      completion:
        "Organization integration governance documented and admin approval verified.",
      dependsOn: ["select-auth-grant"],
    },
  ],
  approvals: [
    {
      title: "User workspace authorization consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "The user must authorize the application on the Asana OAuth consent screen, granting it access to their accessible workspaces.",
        "asana_oauth",
      ),
    },
    {
      title: "Organization admin app authorization",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Organization administrators on Asana Enterprise and Business plans can restrict third-party apps or require admin approval before apps can connect.",
        "asana_oauth",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "OAuth app setup, token exchange, and task read smoke test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has an existing Asana workspace and test project; excludes building progress forecasting algorithms.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Test project creation and sample task population",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Setting up a test project and generating sample tasks with custom fields.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Organization administrator integration review",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only if workspace settings enforce administrative approval for custom integrations.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 429 Too Many Requests",
      recovery: c(
        "Asana limits standard REST API requests to 1,500 requests per minute. Inspect Retry-After headers, introduce client-side queueing, and batch task requests using opt_fields.",
        "asana_limits",
      ),
      owner: "developer",
    },
    {
      title: "Token Expiration After One Hour (HTTP 401)",
      recovery: c(
        "Asana OAuth access tokens expire after 3,600 seconds. Implement token refresh logic calling POST https://app.asana.com/-/oauth_token with grant_type 'refresh_token'.",
        "asana_oauth",
      ),
      owner: "developer",
    },
    {
      title: "Unbounded Token Privilege Risk",
      recovery: c(
        "Because Asana tokens carry write access, audit application code to prevent any POST, PUT, or DELETE requests to task and project endpoints.",
        "asana_oauth",
        "asana_tasks",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open https://app.asana.com/0/developer-console and register an OAuth application with redirect URIs.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "asana_oauth_doc",
      "Asana · OAuth 2.0",
      "https://developers.asana.com/docs/oauth",
    ),
    source(
      "asana_pat_doc",
      "Asana · Personal access token",
      "https://developers.asana.com/docs/personal-access-token",
    ),
    source(
      "asana_tasks_doc",
      "Asana · Tasks API Reference",
      "https://developers.asana.com/docs/tasks",
    ),
    source(
      "asana_limits_doc",
      "Asana · Rate limits",
      "https://developers.asana.com/docs/rate-limits",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific coverage for Asana OAuth 2.0 tokens and full-user scope handling must be verified.",
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
        "Experienced developer; working Asana workspace and test project already available.",
      testId: null,
    },
    {
      id: "asana_oauth",
      kind: "official_docs",
      sourceIds: ["asana_oauth_doc"],
      note: "Asana implements standard OAuth 2.0 Authorization Code Grant at https://app.asana.com/-/oauth_authorize and token exchange at https://app.asana.com/-/oauth_token. Access tokens expire after 1 hour (3,600 seconds) and support refresh tokens.",
      conditions:
        "Tokens inherit the full permissions of the authorizing user; Asana does not provide fine-grained read-only scopes.",
      testId: null,
    },
    {
      id: "asana_pat",
      kind: "official_docs",
      sourceIds: ["asana_pat_doc"],
      note: "Asana provides Personal Access Tokens generated in the developer console for scripting and testing. Tokens do not expire automatically unless unused for prolonged periods or revoked.",
      conditions:
        "Intended for single-user testing or service integrations; carries the authorizing user's full permissions.",
      testId: null,
    },
    {
      id: "asana_tasks",
      kind: "official_docs",
      sourceIds: ["asana_tasks_doc"],
      note: "Asana REST API v1.0 provides endpoints GET /tasks and GET /projects to retrieve task metadata, completion state, due dates, and assignee details.",
      conditions:
        "Use opt_fields query parameters to select needed task properties efficiently.",
      testId: null,
    },
    {
      id: "asana_limits",
      kind: "official_docs",
      sourceIds: ["asana_limits_doc"],
      note: "Asana standard REST API rate limit is 1,500 requests per minute per user/token. Breaches return HTTP 429 with a Retry-After header indicating wait seconds.",
      conditions:
        "Applications must implement client-side rate tracking and back off according to Retry-After headers.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Asana OAuth 2.0, Personal Access Token, Tasks REST API, and rate limit documentation.",
      observation:
        "Documentation establishes OAuth 2.0 authorization code flow, full-user permission model ('default' scope), 1-hour token expiration with refresh tokens, and 1,500 req/min rate limit. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Asana and register an OAuth application in the developer console.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Asana developer console at https://app.asana.com/0/developer-console without credentials.",
      observation:
        "Access requires interactive Asana login before developer apps or Personal Access Tokens can be managed.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Asana account and navigate to the Developer Console.",
    },
  ],
  unresolvedQuestions: [
    "Does your Asana organization restrict members from authorizing third-party OAuth apps?",
    "Will progress tracking query all team projects or only specific tagged milestone projects?",
    "Does Composio's managed Asana toolkit manage refresh token rotation automatically?",
  ],
  researchedAt: at,
};
