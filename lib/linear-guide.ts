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

export const linearGuide: Guide = {
  id: "linear",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Linear",
    domain: "linear.app",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Read and triage incoming issues from a team workspace",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read and triage incoming team workspace issues in Linear",
  summary:
    "Linear relies on OAuth 2.0 Authorization Code Grant for user delegation and serves all API operations through a unified GraphQL endpoint at https://api.linear.app/graphql. Request granular read, write, and comments scopes while strictly excluding admin access.",
  assumptions: [
    "The AI triage agent reads unassigned or incoming issues, applies priority or label updates, and posts triage summary comments without deleting team data.",
    "Initial testing takes place in a dedicated Linear team workspace with synthetic issues inside a controlled backlog.",
    "Linear provides granular OAuth scopes (read, write, issues:create, comments:create) that separate read inspection from issue mutation and workspace administration.",
    "Workspace administrators manage integration approval policies and may restrict third-party OAuth applications.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Linear implements standard OAuth 2.0 Authorization Code Grant with authorization at https://linear.app/oauth/authorize and token exchange at https://api.linear.app/oauth/token, returning bearer access tokens.",
      "linear_oauth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but support for Linear OAuth 2.0 with granular triage scopes (read, write, comments:create) was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Implement the OAuth 2.0 Authorization Code flow with least-privilege scopes: read for inspecting issues and teams, write for updating issue status and priority, and comments:create for posting triage notes. Query and mutate data exclusively via Linear's GraphQL API.",
    "linear_oauth",
    "linear_graphql",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Register an OAuth application in Linear workspace settings, request read and triage scopes, and execute a sample GraphQL query against a controlled test team. No live connection was executed in this guide.",
      "linear_oauth",
      "linear_graphql",
      "unknown",
    ),
    nextAction:
      "Log in to Linear, navigate to Settings > My Account > API > Applications, and create a new OAuth application.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Production deployment across organizational workspaces requires workspace administrator approval of OAuth applications, member consent, and adherence to Linear GraphQL query complexity and rate limits.",
      "linear_admin",
      "linear_graphql",
      "unknown",
    ),
    nextAction:
      "Confirm workspace third-party integration policies with your Linear administrator and implement query complexity optimizations.",
  },
  prerequisites: [
    {
      title: "Linear workspace membership and developer access",
      owner: "developer",
      detail: c(
        "A valid Linear account with membership in the organization workspace is required to access developer settings and create OAuth applications.",
        "linear_oauth",
      ),
    },
    {
      title: "Controlled test team and triage backlog",
      owner: "administrator",
      detail: c(
        "A dedicated Linear team or test project populated with synthetic issues ensures automated triage modifications do not disrupt active engineering sprints.",
        "linear_graphql",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets storage",
      owner: "developer",
      detail: c(
        "Linear client secret and issued user access tokens must be stored in an encrypted server-side credential vault.",
        "linear_oauth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "scope: read",
      rationale: c(
        "Grants read access to issues, teams, projects, labels, and workflow states, allowing the assistant to inspect incoming issues needing triage.",
        "linear_oauth",
        "linear_graphql",
      ),
      condition:
        "Requested during OAuth authorization; essential for inspecting backlog state.",
    },
    {
      name: "scope: write",
      rationale: c(
        "Allows updating issue attributes such as priority, team assignment, project association, and workflow state during triage execution.",
        "linear_oauth",
        "linear_graphql",
      ),
      condition:
        "Required to execute triage mutations such as issueUpdate in the GraphQL API.",
    },
    {
      name: "scope: issues:create",
      rationale: c(
        "Permits creating new sub-issues or follow-up tickets when an incoming issue requires breakdown during triage.",
        "linear_oauth",
      ),
      condition:
        "Request if automated escalation or issue generation is part of the triage pipeline.",
    },
    {
      name: "scope: comments:create",
      rationale: c(
        "Allows posting automated triage rationale, categorization summaries, or questions directly onto the issue conversation thread.",
        "linear_oauth",
      ),
      condition:
        "Request to enable transparent triage communication within issue comments.",
    },
    {
      name: "scope: admin (excluded)",
      rationale: c(
        "Grants administrative control over workspace settings, users, and integrations. Excluded to enforce the principle of least privilege.",
        "linear_oauth",
        "linear_admin",
      ),
      condition:
        "Explicitly excluded; issue triage does not require workspace administration.",
    },
  ],
  steps: [
    {
      id: "register-oauth-app",
      title: "Register OAuth application in Linear settings",
      detail: c(
        "Navigate to Linear Settings > Workspace > Applications (or My Account > API) and register a new OAuth application with name, description, and authorized redirect URI.",
        "linear_oauth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.linear.app/docs/oauth/authentication",
      completion:
        "OAuth application registered with client ID and client secret safely stored.",
      dependsOn: [],
    },
    {
      id: "configure-scopes",
      title: "Select granular triage scopes",
      detail: c(
        "Configure requested scopes for the application: specify read, write, and comments:create while strictly avoiding the admin scope.",
        "linear_oauth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.linear.app/docs/oauth/authentication",
      completion:
        "Least-privilege scope set defined in application configuration.",
      dependsOn: ["register-oauth-app"],
    },
    {
      id: "authorize-workspace",
      title: "Prompt user authorization for Linear workspace",
      detail: c(
        "Direct the user to https://linear.app/oauth/authorize with client_id, redirect_uri, response_type=code, scope (read,write,comments:create), and state parameter.",
        "linear_oauth",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://developers.linear.app/docs/oauth/authentication",
      completion:
        "User approves permissions and authorization code is returned to callback URL.",
      dependsOn: ["configure-scopes"],
    },
    {
      id: "exchange-access-token",
      title: "Exchange authorization code for access token",
      detail: c(
        "Send POST https://api.linear.app/oauth/token with grant_type=authorization_code, code, redirect_uri, client_id, and client_secret to obtain the bearer access token.",
        "linear_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.linear.app/docs/oauth/authentication",
      completion:
        "Access token received and stored in secure backend database.",
      dependsOn: ["authorize-workspace"],
    },
    {
      id: "query-triage-issues",
      title: "Query incoming issues via GraphQL API",
      detail: c(
        "Send a POST request to https://api.linear.app/graphql with Authorization: Bearer <token> and GraphQL query fetching unassigned issues, priority, and workflow states.",
        "linear_graphql",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
      completion:
        "Issue list successfully retrieved and structured for triage analysis.",
      dependsOn: ["exchange-access-token"],
    },
    {
      id: "mutate-issue-triage",
      title: "Apply triage update mutation to test issue",
      detail: c(
        "Execute an issueUpdate GraphQL mutation to update priority or label on a synthetic test issue and post a triage rationale comment via commentCreate.",
        "linear_graphql",
        "linear_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
      completion:
        "Test issue priority updated and triage confirmation comment posted.",
      dependsOn: ["query-triage-issues"],
    },
    {
      id: "admin-governance",
      title: "Confirm workspace administrator integration policy",
      detail: c(
        "Review Linear workspace administration settings to verify whether non-admin members can install third-party OAuth applications across the organization.",
        "linear_admin",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl: "https://linear.app/docs/third-party-application-approvals",
      completion:
        "Workspace integration policy reviewed and organizational authorization verified.",
      dependsOn: ["configure-scopes"],
    },
  ],
  approvals: [
    {
      title: "User workspace authorization consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "The installing user must grant the requested read, write, and comments permissions on the Linear OAuth consent screen.",
        "linear_oauth",
      ),
    },
    {
      title: "Workspace administrator integration review",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Linear workspace administrators may require administrative review before third-party applications can access organizational team issues.",
        "linear_admin",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "OAuth application setup, token exchange, and GraphQL triage test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has an existing Linear workspace and test team; excludes building natural language triage classifiers.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Test team setup and synthetic issue creation",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Creating a dedicated test team with sample backlog issues for triage validation.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Workspace administrator integration review",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only if workspace settings enforce administrative approval for custom OAuth applications.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 401 Unauthorized / Invalid Token or Scope",
      recovery: c(
        "Verify that the access token is passed in the Authorization header as 'Bearer <token>' and that the token was granted the 'write' scope when attempting triage mutations.",
        "linear_oauth",
        "linear_graphql",
      ),
      owner: "developer",
    },
    {
      title: "GraphQL Query Complexity or Rate Limit Exceeded",
      recovery: c(
        "Linear assesses query complexity on GraphQL requests. Limit nested queries, paginate node connections using 'first' and 'after' cursor parameters, and handle rate limit responses gracefully.",
        "linear_graphql",
      ),
      owner: "developer",
    },
    {
      title: "Workspace Administrator OAuth Restriction",
      recovery: c(
        "If a workspace admin has restricted third-party integrations, request the admin enable or whitelist the application in Linear Workspace Settings > Applications.",
        "linear_admin",
        "unknown",
      ),
      owner: "administrator",
    },
  ],
  nextAction:
    "Log in to Linear, navigate to Settings > Workspace > Applications, and create an OAuth application with read, write, and comments:create scopes.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "linear_oauth_doc",
      "Linear · OAuth Authentication",
      "https://developers.linear.app/docs/oauth/authentication",
    ),
    source(
      "linear_graphql_doc",
      "Linear · Working with the GraphQL API",
      "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
    ),
    source(
      "linear_admin_doc",
      "Linear · Third-party app approvals",
      "https://linear.app/docs/third-party-application-approvals",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Linear OAuth 2.0 with granular triage scopes must be verified.",
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
        "Experienced developer; working Linear workspace and test team already available.",
      testId: null,
    },
    {
      id: "linear_oauth",
      kind: "official_docs",
      sourceIds: ["linear_oauth_doc"],
      note: "Linear implements OAuth 2.0 Authorization Code Grant at https://linear.app/oauth/authorize and token exchange at https://api.linear.app/oauth/token. Supports granular scopes including read, write, issues:create, comments:create, and admin.",
      conditions:
        "Requires HTTPS redirect URIs and secure token storage.",
      testId: null,
    },
    {
      id: "linear_graphql",
      kind: "official_docs",
      sourceIds: ["linear_graphql_doc"],
      note: "Linear API is served exclusively via GraphQL at https://api.linear.app/graphql using Authorization: Bearer <access_token>. Enforces query complexity budgets and rate limits on resource consumption.",
      conditions:
        "All queries and mutations must specify needed fields and respect GraphQL complexity limits.",
      testId: null,
    },
    {
      id: "linear_admin",
      kind: "official_docs",
      sourceIds: ["linear_admin_doc"],
      note: "Linear workspace administrators manage workspace security, member permissions, third-party application authorizations, and API access restrictions.",
      conditions:
        "Workspace settings may require admin approval before new OAuth integrations can access team data.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Linear OAuth documentation, GraphQL API guides, granular scopes, and workspace administration settings.",
      observation:
        "Documentation establishes OAuth 2.0 authorization code flow, GraphQL endpoint, granular scopes (read, write, issues:create, comments:create, admin), and query complexity rate limits. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Linear and register an OAuth application in workspace settings.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Linear application settings page at https://linear.app/settings/api without credentials.",
      observation:
        "Access requires interactive Linear login before OAuth applications can be registered or inspected.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Linear account and navigate to API settings.",
    },
  ],
  unresolvedQuestions: [
    "Does your Linear workspace require workspace admin approval before installing third-party OAuth apps?",
    "Will the triage assistant modify status directly or leave recommendations as comments for human review?",
    "Does Composio's managed Linear toolkit support write and comments:create scopes for triage mutations?",
  ],
  researchedAt: at,
};
