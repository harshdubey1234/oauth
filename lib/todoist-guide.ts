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

export const todoistGuide: Guide = {
  id: "todoist",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Todoist",
    domain: "todoist.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Read and organize tasks for an AI daily planner",
    audience: "me",
    stage: "test",
    ownership: "own",
  },
  title: "Read and organize tasks for an AI daily planner",
  summary:
    "Todoist uses the standard OAuth 2.0 authorization code grant flow with long-lived user access tokens. Register an app in the Todoist App Management Console, configure requested scopes (data:read, data:read_write, task:add), and adhere to the 450 requests per 15-minute rate limit.",
  assumptions: [
    "The AI daily planner is built for personal productivity (audience: me) under a developer-owned Todoist account.",
    "Tasks, projects, and labels are accessed via Todoist REST API v2 at https://api.todoist.com/rest/v2/.",
    "Todoist OAuth tokens remain valid indefinitely until explicitly revoked by the user or application.",
    "Outgoing requests are throttled to remain within the published 450 requests per 15-minute rate limit.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Todoist supports standard OAuth 2.0 authorization code flow with permanent access tokens to read and mutate tasks through REST API v2.",
      "todoist_auth",
      "todoist_rest",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for custom fine-grained Todoist scopes (data:read_write, task:add) was not verified in this research.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Register a custom integration in the Todoist App Management Console. Implement the OAuth 2.0 code exchange against https://todoist.com/oauth/access_token and make Bearer-authenticated calls to REST API v2.",
    "todoist_auth",
    "todoist_rest",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Register client credentials in the Todoist App Console, set the redirect URI, and authorize your personal account on a dedicated test project. No live API calls were performed in this guide.",
      "todoist_auth",
      "unknown",
    ),
    nextAction:
      "Open the Todoist App Management Console at https://developer.todoist.com/appconsole.html and create an application.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "For personal use (audience: me), the integration is immediately operational upon token receipt. Public distribution to external Todoist users requires adhering to integration review guidelines and rate limit backoff.",
      "todoist_limits",
      "todoist_auth",
      "unknown",
    ),
    nextAction:
      "Implement rate-limiting controls and token storage encryption before deploying automated scheduling runs.",
  },
  prerequisites: [
    {
      title: "Todoist account and App Console access",
      owner: "developer",
      detail: c(
        "A valid Todoist account is required to register integrations in the App Management Console and obtain client credentials.",
        "todoist_auth",
      ),
    },
    {
      title: "Controlled test project and sample tasks",
      owner: "developer",
      detail: c(
        "A dedicated Todoist project populated with synthetic tasks allows testing task reordering and priority updates without modifying live personal tasks.",
        "todoist_rest",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets and token store",
      owner: "developer",
      detail: c(
        "Todoist access tokens grant enduring access to personal user data; client secrets and acquired tokens must be encrypted at rest.",
        "todoist_auth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "data:read",
      rationale: c(
        "Enables reading all user data including active tasks, projects, sections, labels, and comments needed to inspect the user's daily schedule.",
        "todoist_auth",
        "todoist_rest",
      ),
      condition:
        "Requested during OAuth consent; essential for reading existing tasks and projects.",
    },
    {
      name: "data:read_write",
      rationale: c(
        "Enables creating, updating, and reordering tasks, projects, and labels for full daily planner scheduling automation.",
        "todoist_auth",
        "todoist_rest",
      ),
      condition:
        "Required if the daily planner reschedules, reprioritizes, or modifies existing tasks.",
    },
    {
      name: "task:add",
      rationale: c(
        "Grants permission to add new tasks without providing full write permissions across existing user projects and data.",
        "todoist_auth",
      ),
      condition:
        "Alternative narrower write scope when the agent only appends suggested tasks to the inbox.",
    },
    {
      name: "data:delete",
      rationale: c(
        "Allows deleting tasks and related data when cleaning up or replacing completed plan items.",
        "todoist_auth",
      ),
      condition:
        "Optional; requested only if the planner has explicit authority to delete obsolete user tasks.",
    },
    {
      name: "project:delete (excluded)",
      rationale: c(
        "Grants authority to permanently delete entire user projects. Daily task planning does not require project deletion.",
        "todoist_auth",
      ),
      condition:
        "Explicitly excluded to protect user project hierarchies from accidental destruction.",
    },
  ],
  steps: [
    {
      id: "register-app",
      title: "Register application in Todoist App Console",
      detail: c(
        "Open the Todoist App Management Console (https://developer.todoist.com/appconsole.html) to create an application and generate your client ID and client secret.",
        "todoist_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl: "https://developer.todoist.com/guides/#authorization",
      completion:
        "Application created; client ID and client secret stored in backend environment configuration.",
      dependsOn: [],
    },
    {
      id: "configure-redirect-uri",
      title: "Configure OAuth redirect callback URL",
      detail: c(
        "Set the authorized OAuth redirect URL in your Todoist app settings to match your application's authentication endpoint.",
        "todoist_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl: "https://developer.todoist.com/guides/#authorization",
      completion:
        "Redirect URI saved in the Todoist console and matches the backend callback handler.",
      dependsOn: ["register-app"],
    },
    {
      id: "initiate-oauth",
      title: "Initiate authorization code redirect",
      detail: c(
        "Construct the authorization URL pointing to https://todoist.com/oauth/authorize with client_id, requested scopes (e.g., data:read_write,task:add), and an unguessable state parameter.",
        "todoist_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developer.todoist.com/guides/#authorization",
      completion:
        "User is directed to the Todoist authorization dialog with appropriate query parameters.",
      dependsOn: ["configure-redirect-uri"],
    },
    {
      id: "user-consent",
      title: "Grant account permissions on Todoist consent screen",
      detail: c(
        "The Todoist account owner logs in, reviews the requested permissions, and consents to allow the daily planner access.",
        "todoist_auth",
      ),
      owner: "user",
      path: "test",
      sourceUrl: "https://developer.todoist.com/guides/#authorization",
      completion:
        "User approves access; browser redirects to callback URL with temporary authorization code.",
      dependsOn: ["initiate-oauth"],
    },
    {
      id: "exchange-access-token",
      title: "Exchange authorization code for permanent access token",
      detail: c(
        "Send a POST request to https://todoist.com/oauth/access_token with client_id, client_secret, code, and redirect_uri to retrieve the user's permanent access token.",
        "todoist_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developer.todoist.com/guides/#authorization",
      completion:
        "Access token received and stored securely in encrypted secrets storage.",
      dependsOn: ["user-consent"],
    },
    {
      id: "sync-tasks",
      title: "Fetch and organize tasks via REST API v2",
      detail: c(
        "Call GET https://api.todoist.com/rest/v2/tasks with the Bearer token to inspect active tasks and verify schedule planning on the test project.",
        "todoist_rest",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developer.todoist.com/rest/v2/#overview",
      completion:
        "Active tasks are retrieved, parsed, and updated via REST API v2 endpoints.",
      dependsOn: ["exchange-access-token"],
    },
    {
      id: "rate-limit-handling",
      title: "Implement rate limiting and backoff controls",
      detail: c(
        "Throttle requests to remain well below the 450 requests per 15-minute threshold and implement exponential backoff on HTTP 429 responses.",
        "todoist_limits",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl: "https://developer.todoist.com/guides/#rate-limiting",
      completion:
        "API client enforces request quotas and handles rate limit recovery gracefully.",
      dependsOn: ["register-app"],
    },
  ],
  approvals: [
    {
      title: "User OAuth consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "The Todoist account owner must authorize the application scopes to allow reading and organizing their task list.",
        "todoist_auth",
      ),
    },
    {
      title: "App verification for public distribution",
      kind: "distribution",
      owner: "provider",
      detail: c(
        "Personal use does not require external review. If the daily planner is offered to external users, Todoist integration guidelines apply.",
        "todoist_auth",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Todoist app registration and OAuth token test",
      value: "30–60 minutes",
      basis: "estimated",
      assumptions:
        "Developer has an active Todoist account and an operational local or hosted callback server.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Test project creation and task staging",
      value: "10–20 minutes",
      basis: "estimated",
      assumptions:
        "Creating a dedicated test project and seeding sample tasks for planner evaluation.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Provider app review for public listing",
      value: "Not applicable for personal use; unknown for directory",
      basis: "unknown",
      assumptions:
        "Scenario audience is 'me'; external directory submission is not required for personal testing.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 429 Rate Limit Exceeded",
      recovery: c(
        "Todoist limits applications to 450 requests per 15 minutes per user. Cache frequent queries, batch operations where feasible, and pause execution upon encountering 429 responses.",
        "todoist_limits",
      ),
      owner: "developer",
    },
    {
      title: "OAuth Invalid Redirect URI Mismatch",
      recovery: c(
        "Verify that the redirect URI passed in the authorization URL exactly matches the URI registered in the Todoist App Management Console.",
        "todoist_auth",
      ),
      owner: "developer",
    },
    {
      title: "Insufficient Scopes for Task Updates",
      recovery: c(
        "Ensure the authorization request included data:read_write or task:add rather than solely data:read if the planner attempts to modify or create tasks.",
        "todoist_auth",
        "todoist_rest",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open the Todoist App Management Console at https://developer.todoist.com/appconsole.html and register an integration.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "todoist_auth_doc",
      "Todoist · Authorization Guide",
      "https://developer.todoist.com/guides/#authorization",
    ),
    source(
      "todoist_rest_doc",
      "Todoist · REST API v2 Overview",
      "https://developer.todoist.com/rest/v2/#overview",
    ),
    source(
      "todoist_limits_doc",
      "Todoist · Rate Limiting Guide",
      "https://developer.todoist.com/guides/#rate-limiting",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Todoist fine-grained scopes must be confirmed before use.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or provider approval requirement has not been established from official documentation.",
      conditions:
        "Confirm with your Todoist account settings or provider console.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for configuration and minimal read test, not an observed execution duration.",
      conditions:
        "Experienced developer; working Todoist account and callback endpoint already available.",
      testId: null,
    },
    {
      id: "todoist_auth",
      kind: "official_docs",
      sourceIds: ["todoist_auth_doc"],
      note: "Todoist implements OAuth 2.0 authorization code flow. Clients send users to https://todoist.com/oauth/authorize with client_id, scope, and state, then exchange the temporary code at https://todoist.com/oauth/access_token.",
      conditions:
        "Valid client credentials registered in the Todoist App Management Console are required.",
      testId: null,
    },
    {
      id: "todoist_rest",
      kind: "official_docs",
      sourceIds: ["todoist_rest_doc"],
      note: "Todoist REST API v2 is hosted at https://api.todoist.com/rest/v2/. Endpoints support querying and mutating tasks, projects, sections, comments, and labels with Bearer token authentication.",
      conditions:
        "Token must possess the necessary permission scopes for the target resources.",
      testId: null,
    },
    {
      id: "todoist_limits",
      kind: "official_docs",
      sourceIds: ["todoist_limits_doc"],
      note: "Todoist enforces a rate limit of 450 requests per 15-minute interval per authorized user. Calls exceeding this threshold receive HTTP 429 Too Many Requests.",
      conditions:
        "Client applications must respect rate limits and back off upon encountering HTTP 429.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Todoist REST API v2 authorization, endpoints, and rate limit documentation.",
      observation:
        "Documentation establishes OAuth 2.0 endpoints, data:read/read_write scopes, permanent access token characteristics, and the 450 req/15min user rate limit. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Todoist and create an integration in the App Management Console.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Todoist App Management Console at https://developer.todoist.com/appconsole.html without credentials.",
      observation:
        "Access requires interactive Todoist account authentication to view or generate API client credentials.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Todoist account and create developer credentials.",
    },
  ],
  unresolvedQuestions: [
    "Will the daily planner require continuous background task synchronization or manual user-triggered refreshes?",
    "Does the planner need authority to delete completed tasks (requiring data:delete) or simply close them via REST API v2?",
    "Does Composio's managed Todoist toolkit support the full set of fine-grained scopes needed for custom daily planning?",
  ],
  researchedAt: at,
};
