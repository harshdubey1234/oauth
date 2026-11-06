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

export const googleCalendarGuide: Guide = {
  id: "google-calendar",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Google Calendar",
    domain: "calendar.google.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Read calendar events and free/busy for an AI scheduling assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read calendar events and free/busy for scheduling assistance",
  summary:
    "Google Calendar API uses OAuth 2.0 authorization. The calendar.readonly scope is classified as a sensitive scope in Google Cloud Console. For internal organization scheduling, configure an internal OAuth consent screen or a service account with domain-wide delegation in Google Workspace to bypass public verification.",
  assumptions: [
    "The AI scheduling assistant needs read-only access to calendar events and free/busy availability to suggest meeting slots, without creating or modifying events.",
    "Testing is conducted within a Google Workspace organization domain using a developer-owned Google Cloud project.",
    "The Google Cloud OAuth consent screen is configured for an Organization (Internal) audience, which exempts the integration from Google third-party verification.",
    "For automated organization-wide calendar reading without per-user consent prompts, Google Workspace administrators can alternatively grant domain-wide delegation to a service account.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Google implements OAuth 2.0 web-server authorization code flow for user-delegated calendar access. Google Calendar scopes are classified into non-sensitive, sensitive, and restricted tiers.",
      "cal_auth",
      "web_server",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Google Calendar sensitive scopes and domain-wide delegation in this specific organizational scheduling scenario was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "For interactive user scheduling, implement the standard OAuth 2.0 authorization code flow with the sensitive calendar.readonly scope under an Internal Google Cloud project. For automated background scheduling across organizational users, have a Google Workspace administrator configure a service account with domain-wide delegation.",
    "cal_auth",
    "web_server",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create an OAuth 2.0 web application client in Google Cloud Console, configure authorized redirect URIs, and authorize an internal Workspace test account. No live API call has been executed in this guide.",
      "cal_auth",
      "web_server",
      "unknown",
    ),
    nextAction:
      "Open Google Cloud Console, enable the Google Calendar API, and configure an internal OAuth consent screen.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Organization launch requires Google Workspace administrator approval if using domain-wide delegation, or configuration as an Internal app to avoid Google OAuth sensitive scope verification and annual assessments.",
      "cal_auth",
      "oauth_scopes",
      "unknown",
    ),
    nextAction:
      "Confirm with your Google Workspace administrator whether internal OAuth consent or domain-wide delegation is the approved architectural path.",
  },
  prerequisites: [
    {
      title: "Google Cloud project with Calendar API enabled",
      owner: "developer",
      detail: c(
        "A Google Cloud project with billing enabled and the Google Calendar API activated in the API library is required to issue client credentials.",
        "cal_overview",
        "cal_auth",
      ),
    },
    {
      title: "Google Workspace organization domain membership",
      owner: "administrator",
      detail: c(
        "An organizational Google Workspace tenant is needed to set the OAuth consent screen to Internal or to grant domain-wide delegation.",
        "cal_auth",
        "unknown",
      ),
    },
    {
      title: "OAuth 2.0 Web Application credentials or Service Account",
      owner: "developer",
      detail: c(
        "Client ID and client secret must be generated for web server authorization, or a service account key created for domain-wide delegation.",
        "web_server",
        "cal_auth",
      ),
    },
    {
      title: "Secure backend secrets storage and token refresh handler",
      owner: "developer",
      detail: c(
        "Access tokens expire in one hour. The backend must securely store refresh tokens and client secrets, issuing token refresh requests as needed.",
        "web_server",
      ),
    },
  ],
  permissions: [
    {
      name: "https://www.googleapis.com/auth/calendar.readonly",
      rationale: c(
        "Grants read-only access to calendar events and metadata across calendars accessible to the authorized account, required to read scheduling conflicts and event timings.",
        "cal_auth",
        "events_list",
        "oauth_scopes",
      ),
      condition:
        "Sensitive scope. Internal Workspace apps bypass Google verification; external publication requires Google review.",
    },
    {
      name: "https://www.googleapis.com/auth/calendar.freebusy",
      rationale: c(
        "Grants read-only access to free/busy availability information without exposing event summaries, descriptions, or attendees.",
        "cal_auth",
        "oauth_scopes",
      ),
      condition:
        "Sufficient when the scheduling assistant only needs busy/free blocks rather than event details.",
    },
    {
      name: "https://www.googleapis.com/auth/calendar (excluded)",
      rationale: c(
        "Grants full read/write access to all calendars and events. Excluded to uphold the principle of least privilege for a read-only scheduling assistant.",
        "cal_auth",
        "cal_overview",
      ),
      condition:
        "Explicitly excluded to avoid unnecessary permissions and scrutiny.",
    },
  ],
  steps: [
    {
      id: "enable-calendar-api",
      title: "Enable Google Calendar API in Google Cloud Console",
      detail: c(
        "Open Google Cloud Console (console.cloud.google.com), select your project, navigate to APIs & Services > Library, and enable the Google Calendar API.",
        "cal_overview",
        "cal_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.google.com/calendar/api/guides/overview",
      completion:
        "Google Calendar API is enabled and listed under active APIs in the Cloud project.",
      dependsOn: [],
    },
    {
      id: "configure-consent-screen",
      title: "Configure OAuth consent screen with Internal audience",
      detail: c(
        "Navigate to Google Auth Platform / OAuth consent screen, select User Type as Internal (accessible only to users in your Google Workspace organization), and specify the calendar.readonly sensitive scope.",
        "cal_auth",
        "oauth_scopes",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.google.com/calendar/api/guides/auth",
      completion:
        "OAuth consent screen configured with Internal audience, bypassing external verification.",
      dependsOn: ["enable-calendar-api"],
    },
    {
      id: "create-oauth-client",
      title: "Create OAuth 2.0 web client credentials",
      detail: c(
        "Under Credentials, click Create Credentials > OAuth client ID. Select Web application, and add your backend's authorized redirect URIs for handling OAuth callbacks.",
        "web_server",
        "cal_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "Client ID and client secret generated and stored in secure backend environment variables.",
      dependsOn: ["configure-consent-screen"],
    },
    {
      id: "request-user-authorization",
      title: "Initiate OAuth 2.0 authorization code flow",
      detail: c(
        "Redirect the user to https://accounts.google.com/o/oauth2/v2/auth with client_id, redirect_uri, response_type=code, scope=https://www.googleapis.com/auth/calendar.readonly, access_type=offline, and prompt=consent to ensure a refresh token is returned.",
        "web_server",
        "cal_auth",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "User consents to calendar read access and Google redirects with an authorization code to the redirect URI.",
      dependsOn: ["create-oauth-client"],
    },
    {
      id: "exchange-auth-code",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Send a POST request from your backend to https://oauth2.googleapis.com/token with code, client_id, client_secret, redirect_uri, and grant_type=authorization_code.",
        "web_server",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "Access token and refresh token received and securely persisted in the backend database.",
      dependsOn: ["request-user-authorization"],
    },
    {
      id: "fetch-calendar-events",
      title: "Query calendar events and free/busy availability",
      detail: c(
        "Call GET https://www.googleapis.com/calendar/v3/calendars/primary/events with timeMin, timeMax, and singleEvents=true using the Bearer access token to verify event extraction.",
        "events_list",
        "cal_overview",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/calendar/api/v3/reference/events/list",
      completion:
        "Calendar events retrieved successfully and verified by the scheduling assistant service.",
      dependsOn: ["exchange-auth-code"],
    },
    {
      id: "configure-domain-wide-delegation",
      title: "Optionally configure service account domain-wide delegation",
      detail: c(
        "For autonomous background scheduling across organizational users without per-user prompts, create a service account and have a Workspace administrator authorize its client ID with calendar scopes in the Google Workspace Admin Console under API controls.",
        "cal_auth",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://developers.google.com/calendar/api/guides/auth",
      completion:
        "Service account authorized for domain-wide delegation across the Google Workspace domain.",
      dependsOn: ["configure-consent-screen"],
    },
    {
      id: "token-refresh-and-quota",
      title: "Implement automatic token refresh and handle Calendar API rate limits",
      detail: c(
        "Implement a token refresh routine before access tokens expire (3600 seconds) using the refresh token, and add exponential backoff for Google Calendar API rate limits and quota errors.",
        "web_server",
        "cal_overview",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "Automatic token refresh and API quota retry mechanisms deployed to production backend.",
      dependsOn: ["exchange-auth-code"],
    },
  ],
  approvals: [
    {
      title: "Internal organization user consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing Google Workspace user approves calendar.readonly permissions on the Google OAuth consent screen.",
        "cal_auth",
        "web_server",
      ),
    },
    {
      title: "Workspace domain-wide delegation approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Google Workspace administrator must authorize the service account Client ID under Security > API controls > Domain-wide delegation if using service account access.",
        "cal_auth",
        "unknown",
      ),
    },
    {
      title: "Google sensitive scope verification (conditional)",
      kind: "verification",
      owner: "provider",
      detail: c(
        "Required only if the OAuth consent screen is configured for an External audience rather than Internal to the Google Workspace organization.",
        "cal_auth",
        "oauth_scopes",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Cloud project setup + Calendar read smoke test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Existing Google Cloud project and Workspace organization; excludes AI scheduling logic development.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Google Workspace administration and test account preparation",
      value: "30–60 minutes",
      basis: "estimated",
      assumptions:
        "Setting up test accounts and calendar events within the organization domain.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Google Workspace admin delegation review or external verification",
      value: "Unknown; administrator or Google review dependent",
      basis: "unknown",
      assumptions:
        "Internal apps need Workspace admin action; external apps require Google verification review (several business days to weeks).",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "Sensitive Scope Verification Block",
      recovery: c(
        "If app audience is set to External, calendar.readonly triggers Google sensitive scope verification requiring a demo video and privacy policy. Switch audience to Internal for organization-only use.",
        "cal_auth",
        "oauth_scopes",
      ),
      owner: "developer",
    },
    {
      title: "Domain-Wide Delegation Not Authorized",
      recovery: c(
        "Ensure Google Workspace administrator has added the service account client ID under Admin Console > Security > API Controls > Domain-wide delegation with the exact scope URL.",
        "cal_auth",
        "unknown",
      ),
      owner: "administrator",
    },
    {
      title: "Token Expired or Invalid Refresh Token",
      recovery: c(
        "Google access tokens expire in 3600 seconds. Ensure prompt=consent and access_type=offline were supplied during initial authorization to receive a refresh token.",
        "web_server",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Enable the Google Calendar API in Google Cloud Console and configure the OAuth consent screen with Internal audience.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "calendar_auth_doc",
      "Google Calendar · Authorizing Requests to the Google Calendar API",
      "https://developers.google.com/calendar/api/guides/auth",
    ),
    source(
      "events_list_doc",
      "Google Calendar · Events: list API Reference",
      "https://developers.google.com/calendar/api/v3/reference/events/list",
    ),
    source(
      "oauth_scopes_doc",
      "Google Identity · OAuth 2.0 Scopes for Google APIs",
      "https://developers.google.com/identity/protocols/oauth2/scopes",
    ),
    source(
      "calendar_overview_doc",
      "Google Calendar · Google Calendar API Overview",
      "https://developers.google.com/calendar/api/guides/overview",
    ),
    source(
      "web_server_doc",
      "Google Identity · Using OAuth 2.0 for Web Server Applications",
      "https://developers.google.com/identity/protocols/oauth2/web-server",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Google Calendar sensitive scopes and domain-wide delegation must be verified.",
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
        "Experienced developer with Google Cloud Console and Google Workspace admin access available.",
      testId: null,
    },
    {
      id: "cal_auth",
      kind: "official_docs",
      sourceIds: ["calendar_auth_doc"],
      note: "Google Calendar API documentation covers authorization via OAuth 2.0 web-server flow and service accounts with domain-wide delegation in Google Workspace, noting sensitive scope handling.",
      conditions:
        "Applies to Google Calendar API requests; service accounts require Google Workspace domain-wide delegation.",
      testId: null,
    },
    {
      id: "events_list",
      kind: "official_docs",
      sourceIds: ["events_list_doc"],
      note: "The Events: list method accepts parameters like calendarId, timeMin, timeMax, and singleEvents, requiring the https://www.googleapis.com/auth/calendar.readonly scope.",
      conditions:
        "Requires authenticated request with appropriate calendar scope.",
      testId: null,
    },
    {
      id: "oauth_scopes",
      kind: "official_docs",
      sourceIds: ["oauth_scopes_doc"],
      note: "Google Identity scopes directory classifies https://www.googleapis.com/auth/calendar.readonly as a sensitive scope requiring app verification when published externally.",
      conditions:
        "Sensitive scopes require verification unless app audience is restricted to Internal Workspace users.",
      testId: null,
    },
    {
      id: "cal_overview",
      kind: "official_docs",
      sourceIds: ["calendar_overview_doc"],
      note: "The Calendar API overview introduces core concepts including Calendars, Events, FreeBusy queries, and API enabling in Google Cloud Console.",
      conditions:
        "Requires Google Cloud project with Google Calendar API activated.",
      testId: null,
    },
    {
      id: "web_server",
      kind: "official_docs",
      sourceIds: ["web_server_doc"],
      note: "Google OAuth 2.0 web-server flow documentation details authorization code acquisition, token exchange endpoint, offline access for refresh tokens, and redirect URI matching.",
      conditions:
        "Requires secure server environment for client secret storage.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Review Google Calendar API auth guide, events list reference, OAuth scopes directory, and web-server flow.",
      observation:
        "Confirmed calendar.readonly is classified as a sensitive scope, OAuth 2.0 web-server flow with offline access issues refresh tokens, and domain-wide delegation supports organizational service accounts.",
      outcome: "observed",
      stoppedAt: "Before authenticated Google Cloud project configuration.",
      humanNext:
        "Sign in to Google Cloud Console and configure the OAuth consent screen.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Check Google Cloud Console OAuth credentials portal at https://console.cloud.google.com/apis/credentials without credentials.",
      observation:
        "Access redirects to Google login page requiring interactive Google Cloud account authentication.",
      outcome: "blocked",
      stoppedAt: "Interactive Google authentication gate.",
      humanNext:
        "Sign in with an authorized Google Workspace developer account.",
    },
  ],
  unresolvedQuestions: [
    "Will the AI scheduling assistant operate as per-user delegated OAuth or as a central service account with domain-wide delegation?",
    "Will the application ever need to be published to external Google accounts outside the Workspace organization?",
    "Does Composio managed auth support domain-wide delegation or only individual user OAuth 2.0 flows for Google Calendar?",
  ],
  researchedAt: at,
};
