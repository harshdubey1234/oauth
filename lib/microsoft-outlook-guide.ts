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

export const microsoftOutlookGuide: Guide = {
  id: "microsoft-outlook",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Microsoft Outlook",
    domain: "microsoft.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Read emails and calendar events for an AI executive assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read emails and calendar events via Microsoft Graph for executive assistance",
  summary:
    "Microsoft Outlook data is accessed via Microsoft Graph using the Microsoft Identity Platform (Entra ID) OAuth 2.0 authorization code flow. Reading emails and calendars requires delegated permissions Mail.Read, Calendars.Read, and User.Read, which frequently require tenant administrator consent in enterprise Microsoft 365 environments.",
  assumptions: [
    "The AI executive assistant needs read-only access to messages and calendar appointments to summarize inboxes and organize schedules without sending emails or editing events.",
    "Testing occurs inside a Microsoft 365 developer tenant or organizational sandbox tenant.",
    "The integration uses delegated user authorization rather than tenant-wide application permissions, ensuring the assistant acts within the authorizing user's permissions.",
    "Enterprise tenant consent policies may require tenant admin consent for Mail.Read and Calendars.Read scopes.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Microsoft Identity Platform implements OAuth 2.0 authorization code flow with PKCE on v2.0 endpoints. Permissions for Outlook resources are accessed via Microsoft Graph delegated permissions.",
      "graph_auth",
      "auth_code_flow",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Microsoft Graph delegated mail and calendar scopes under enterprise tenant admin consent policies was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Implement the Microsoft Identity Platform OAuth 2.0 authorization code flow with PKCE, requesting delegated permissions Mail.Read, Calendars.Read, and User.Read. Coordinate with the tenant administrator to ensure consent policies allow user consent or grant tenant-wide admin consent.",
    "graph_auth",
    "auth_code_flow",
    "perm_ref",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Register an application in the Microsoft Entra admin center, configure redirect URIs, and test authorization code acquisition using a test M365 user account. No live API call has been executed in this guide.",
      "register_app",
      "auth_code_flow",
      "unknown",
    ),
    nextAction:
      "Open the Microsoft Entra admin center at entra.microsoft.com and register a new test application under App registrations.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Organizational launch depends on tenant admin consent policies for mail and calendar reading, publisher verification if deploying multi-tenant, and handling token lifecycle with refresh rotation.",
      "graph_auth",
      "perm_ref",
      "unknown",
    ),
    nextAction:
      "Verify tenant user consent settings with your Microsoft 365 Global Administrator and determine whether an admin consent grant is necessary.",
  },
  prerequisites: [
    {
      title: "Microsoft Entra ID (Azure AD) tenant and developer account",
      owner: "developer",
      detail: c(
        "A Microsoft 365 or Entra ID tenant with appropriate licensing and permissions to register applications is required.",
        "register_app",
      ),
    },
    {
      title: "Application registration in Microsoft Entra admin center",
      owner: "developer",
      detail: c(
        "An application registration with Web platform redirect URIs and generated client secret (or certificate) is needed for OAuth.",
        "register_app",
        "auth_code_flow",
      ),
    },
    {
      title: "Tenant administrator consent grant or consent policy alignment",
      owner: "administrator",
      detail: c(
        "Tenant administrators may need to grant admin consent or approve the application through an enterprise consent workflow for Mail.Read and Calendars.Read.",
        "graph_auth",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets storage with PKCE and token refresh support",
      owner: "developer",
      detail: c(
        "Microsoft Graph tokens expire in 60-90 minutes. Refresh tokens must be stored securely and exchanged proactively before expiry.",
        "auth_code_flow",
      ),
    },
  ],
  permissions: [
    {
      name: "Mail.Read",
      rationale: c(
        "Allows the app to read emails in user mailboxes. Required for the executive assistant to summarize incoming correspondence and extract action items.",
        "perm_ref",
        "list_messages",
      ),
      condition:
        "Delegated permission. In many enterprise tenants, user consent is restricted by policy and requires tenant administrator approval.",
    },
    {
      name: "Calendars.Read",
      rationale: c(
        "Allows the app to read events in user calendars. Required for checking schedule availability, meeting times, and executive commitments.",
        "perm_ref",
        "graph_auth",
      ),
      condition:
        "Delegated permission. Subject to tenant user consent policies.",
    },
    {
      name: "User.Read",
      rationale: c(
        "Allows users to sign in to the app and permits reading the signed-in user's basic profile to identify mailbox identity and tenant routing.",
        "perm_ref",
        "register_app",
      ),
      condition:
        "Standard delegated permission, typically available for user self-consent in most tenants.",
    },
    {
      name: "Mail.ReadWrite (excluded)",
      rationale: c(
        "Grants permission to create, update, or delete emails. Excluded to maintain least-privilege read-only access.",
        "perm_ref",
      ),
      condition:
        "Explicitly excluded to protect email integrity.",
    },
    {
      name: "Calendars.ReadWrite (excluded)",
      rationale: c(
        "Grants permission to create, modify, or delete calendar events. Excluded as the scenario only requires read-only assistant summaries.",
        "perm_ref",
      ),
      condition:
        "Explicitly excluded to prevent accidental schedule changes.",
    },
  ],
  steps: [
    {
      id: "register-entra-app",
      title: "Register application in Microsoft Entra admin center",
      detail: c(
        "Sign in to the Microsoft Entra admin center (entra.microsoft.com), navigate to Identity > Applications > App registrations, and register a new single-tenant or multi-tenant application.",
        "register_app",
        "graph_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
      completion:
        "Application registered; Application (client) ID and Directory (tenant) ID recorded.",
      dependsOn: [],
    },
    {
      id: "configure-redirect-uri-and-secret",
      title: "Configure redirect URI and generate client secret",
      detail: c(
        "Under Authentication, add a Web platform redirect URI matching your backend callback. Under Certificates & secrets, generate a new client secret and record its value securely.",
        "register_app",
        "auth_code_flow",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
      completion:
        "Redirect URI and client secret saved in secure environment configuration.",
      dependsOn: ["register-entra-app"],
    },
    {
      id: "configure-delegated-permissions",
      title: "Configure delegated permissions for Microsoft Graph",
      detail: c(
        "Under API permissions, add Microsoft Graph delegated permissions: Mail.Read, Calendars.Read, and User.Read. Avoid application permissions to preserve user context.",
        "perm_ref",
        "graph_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://learn.microsoft.com/en-us/graph/permissions-reference",
      completion:
        "Delegated permissions declared on the app registration.",
      dependsOn: ["register-entra-app"],
    },
    {
      id: "request-admin-consent",
      title: "Review and grant tenant administrator consent if required",
      detail: c(
        "If tenant policy restricts user consent for mail and calendar access, have an Entra ID Global Administrator or Privileged Role Administrator grant admin consent for the tenant.",
        "graph_auth",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://learn.microsoft.com/en-us/graph/auth/auth-concepts",
      completion:
        "Admin consent granted for declared delegated permissions across the tenant.",
      dependsOn: ["configure-delegated-permissions"],
    },
    {
      id: "initiate-oauth-code-flow",
      title: "Initiate OAuth 2.0 authorization code flow with PKCE",
      detail: c(
        "Redirect user to https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize with client_id, response_type=code, redirect_uri, response_mode=query, scope=Mail.Read Calendars.Read User.Read offline_access, state, and PKCE code_challenge.",
        "auth_code_flow",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow",
      completion:
        "User logs in and consents, and Microsoft redirects with an authorization code to the redirect URI.",
      dependsOn: ["configure-redirect-uri-and-secret", "configure-delegated-permissions"],
    },
    {
      id: "exchange-code-for-tokens",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Send POST request to https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token with client_id, client_secret, code, redirect_uri, grant_type=authorization_code, and PKCE code_verifier.",
        "auth_code_flow",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow",
      completion:
        "JWT access token and refresh token received and stored securely in backend session.",
      dependsOn: ["initiate-oauth-code-flow"],
    },
    {
      id: "query-messages-and-calendar",
      title: "Execute Microsoft Graph read queries for messages and events",
      detail: c(
        "Call GET https://graph.microsoft.com/v1.0/me/messages?$top=10 and GET https://graph.microsoft.com/v1.0/me/events?$top=10 with the Bearer token to test executive data retrieval.",
        "list_messages",
        "graph_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://learn.microsoft.com/en-us/graph/api/user-list-messages",
      completion:
        "Mail messages and calendar events retrieved and verified by executive assistant service.",
      dependsOn: ["exchange-code-for-tokens"],
    },
    {
      id: "handle-token-lifecycle-and-throttling",
      title: "Handle token refresh and Microsoft Graph throttling limits",
      detail: c(
        "Implement background token refresh prior to access token expiration (typically 60-90 minutes) and observe Microsoft Graph 429 throttling headers with Retry-After backoff.",
        "auth_code_flow",
        "graph_auth",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow",
      completion:
        "Resilient token refresh and rate limit handling implemented in production service.",
      dependsOn: ["exchange-code-for-tokens"],
    },
  ],
  approvals: [
    {
      title: "User delegated consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing Microsoft 365 user consents to Mail.Read, Calendars.Read, and User.Read permissions during the interactive OAuth login flow.",
        "auth_code_flow",
        "graph_auth",
      ),
    },
    {
      title: "Tenant administrator consent",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "In enterprise tenants with restricted user consent settings, an Entra ID administrator must grant tenant-wide consent for mail and calendar reading.",
        "graph_auth",
        "unknown",
      ),
    },
    {
      title: "Publisher verification (conditional)",
      kind: "verification",
      owner: "provider",
      detail: c(
        "Required for multi-tenant applications to display a verified publisher badge on the consent screen and meet enterprise compliance standards.",
        "register_app",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Entra ID app registration + Graph read smoke test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Working Microsoft 365 developer tenant and web server environment available; excludes executive summarization model development.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Tenant setup and admin consent policy configuration",
      value: "30–60 minutes",
      basis: "estimated",
      assumptions:
        "Arranging administrator permissions and configuring consent policies.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Microsoft 365 tenant administrator review and consent grant",
      value: "Unknown; tenant-dependent",
      basis: "unknown",
      assumptions:
        "Applies in managed enterprise tenants where admin consent workflows are enforced.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "AADSTS65001: The user or administrator has not consented to use the application",
      recovery: c(
        "Tenant consent policy prevents standard users from consenting to Mail.Read or Calendars.Read. Request a tenant administrator grant tenant-wide consent or configure an admin consent workflow in Entra ID.",
        "graph_auth",
        "unknown",
      ),
      owner: "administrator",
    },
    {
      title: "AADSTS50011: The redirect URI specified in the request does not match the redirect URIs configured for the application",
      recovery: c(
        "Check the exact redirect URI in Microsoft Entra admin center under Authentication, ensuring protocol, hostname, port, and trailing slashes match verbatim.",
        "register_app",
        "auth_code_flow",
      ),
      owner: "developer",
    },
    {
      title: "HTTP 429 Too Many Requests (Microsoft Graph Throttling)",
      recovery: c(
        "Microsoft Graph enforces per-tenant and per-user throttling limits. Parse the Retry-After response header and implement exponential backoff.",
        "graph_auth",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Register an application in Microsoft Entra admin center and configure delegated Mail.Read and Calendars.Read permissions.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "graph_auth_doc",
      "Microsoft Graph · Authentication and authorization basics",
      "https://learn.microsoft.com/en-us/graph/auth/auth-concepts",
    ),
    source(
      "permissions_ref_doc",
      "Microsoft Graph · Permissions reference",
      "https://learn.microsoft.com/en-us/graph/permissions-reference",
    ),
    source(
      "list_messages_doc",
      "Microsoft Graph · List messages API Reference",
      "https://learn.microsoft.com/en-us/graph/api/user-list-messages",
    ),
    source(
      "register_app_doc",
      "Microsoft Entra · Quickstart: Register an application",
      "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
    ),
    source(
      "auth_code_flow_doc",
      "Microsoft Entra · OAuth 2.0 authorization code flow",
      "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Microsoft Graph delegated mail and calendar scopes must be verified.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or tenant approval requirement has not been established from official documentation.",
      conditions:
        "Confirm with your Microsoft 365 tenant administrator or Entra admin center.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for configuration and minimal read test, not an observed execution duration.",
      conditions:
        "Experienced developer with access to Microsoft Entra admin center and an M365 tenant.",
      testId: null,
    },
    {
      id: "graph_auth",
      kind: "official_docs",
      sourceIds: ["graph_auth_doc"],
      note: "Microsoft Graph authentication documentation explains delegated permissions vs application permissions, tenant consent frameworks, and throttling behavior.",
      conditions:
        "Delegated permissions operate on behalf of the signed-in user and respect user consent policies.",
      testId: null,
    },
    {
      id: "perm_ref",
      kind: "official_docs",
      sourceIds: ["permissions_ref_doc"],
      note: "Permissions reference defines Mail.Read, Calendars.Read, and User.Read, noting consent requirements and least-privilege principles.",
      conditions:
        "Mail.Read and Calendars.Read may require administrator consent depending on tenant settings.",
      testId: null,
    },
    {
      id: "list_messages",
      kind: "official_docs",
      sourceIds: ["list_messages_doc"],
      note: "The messages endpoint GET /me/messages lists messages in the user's mailbox and requires Mail.Read or Mail.ReadBasic delegated permissions.",
      conditions:
        "Requires valid Bearer token authorized for Mail.Read.",
      testId: null,
    },
    {
      id: "register_app",
      kind: "official_docs",
      sourceIds: ["register_app_doc"],
      note: "Microsoft Entra quickstart guides registration of web applications, configuration of supported account types, redirect URIs, and credentials.",
      conditions:
        "Requires developer or administrator access in an Entra ID tenant.",
      testId: null,
    },
    {
      id: "auth_code_flow",
      kind: "official_docs",
      sourceIds: ["auth_code_flow_doc"],
      note: "Microsoft identity platform OAuth 2.0 authorization code flow specification covers authorize endpoint parameters, PKCE code challenge, token endpoint exchange, and refresh token rotation.",
      conditions:
        "Requires secure backend for token exchange and refresh persistence.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect Microsoft Graph auth concepts, permissions reference, list messages endpoint, and Entra ID OAuth 2.0 flow.",
      observation:
        "Confirmed delegated permissions Mail.Read, Calendars.Read, and User.Read require Entra ID v2.0 authorization code flow with PKCE, and admin consent may be enforced by tenant policy.",
      outcome: "observed",
      stoppedAt: "Before authenticated Azure / Entra admin center app registration.",
      humanNext:
        "Sign in to Microsoft Entra admin center and register the application.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Navigate to Microsoft Entra admin center at https://entra.microsoft.com without credentials.",
      observation:
        "Access redirects to Microsoft organizational login gate.",
      outcome: "blocked",
      stoppedAt: "Interactive Microsoft identity login prompt.",
      humanNext:
        "Sign in with tenant administrator or application developer credentials.",
    },
  ],
  unresolvedQuestions: [
    "Does your target Microsoft 365 tenant allow user self-consent for Mail.Read and Calendars.Read, or is admin consent strictly mandated?",
    "Will the application be deployed single-tenant or multi-tenant across external customer organizations (which triggers publisher verification)?",
    "Does Composio managed Microsoft auth support delegated mail and calendar reading or only specific predefined actions?",
  ],
  researchedAt: at,
};
