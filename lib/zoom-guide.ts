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

export const zoomGuide: Guide = {
  id: "zoom",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Zoom",
    domain: "zoom.us",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read meeting schedules and recordings for an AI meeting summarizer",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read meeting schedules and recordings for an AI meeting summarizer",
  summary:
    "Zoom supports OAuth 2.0 authorization code flow as well as Server-to-Server OAuth. Register an app in the Zoom App Marketplace, configure granular read scopes (meeting:read, cloud_recording:read, user:read), and query meeting schedules and cloud recording transcripts at https://api.zoom.us/v2/.",
  assumptions: [
    "The AI meeting summarizer extracts meeting schedules, participant lists, and recording download URLs or audio transcripts to produce meeting summaries.",
    "Initial testing is conducted on a Zoom account where the developer has privileges to create marketplace apps and access test meetings.",
    "Cloud recording access requires a paid Zoom plan (Pro, Business, or Enterprise) with cloud recording enabled.",
    "Zoom access tokens expire in 1 hour; integrations must persist refresh tokens and handle rate limits based on subscription tier.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Zoom provides OAuth 2.0 authorization code flow for user-level delegation and Server-to-Server OAuth for account-level internal automation.",
      "zoom_oauth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed OAuth apps, but toolkit coverage for Zoom cloud recording downloads and granular read scopes was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Create an OAuth app or Server-to-Server OAuth app in the Zoom App Marketplace, configure granular scopes (meeting:read, cloud_recording:read, user:read), execute the authorization code flow, and query Zoom REST API v2 endpoints.",
    "zoom_oauth",
    "zoom_create",
    "zoom_api",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create a draft app in Zoom App Marketplace to test OAuth authorization and API queries on developer-owned meetings. No live connection has been made in this guide.",
      "zoom_oauth",
      "unknown",
    ),
    nextAction:
      "Log in to marketplace.zoom.us and create a draft OAuth app.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Internal organization deployment requires account administrator pre-approval; publishing to the public Zoom App Marketplace requires passing functional, security, and technical reviews.",
      "zoom_publish",
      "unknown",
    ),
    nextAction:
      "Decide between internal account distribution or public Zoom App Marketplace publishing.",
  },
  prerequisites: [
    {
      title: "Zoom Account with Developer Role",
      owner: "developer",
      detail: c(
        "Access to marketplace.zoom.us is required to create apps, generate credentials, and define redirect URLs.",
        "zoom_create",
      ),
    },
    {
      title: "Zoom Pro/Business account with Cloud Recording",
      owner: "administrator",
      detail: c(
        "Accessing cloud recordings via API requires an active Zoom plan with cloud recording enabled in account settings.",
        "zoom_api",
        "unknown",
      ),
    },
    {
      title: "Zoom Account Admin app approval",
      owner: "administrator",
      detail: c(
        "If the app requests account-level data or if pre-approval is enforced in the account, a Zoom administrator must approve it.",
        "zoom_create",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "meeting:read",
      rationale: c(
        "Allows reading meeting details, upcoming schedules, and meeting metadata needed to plan summarization jobs.",
        "zoom_api",
      ),
      condition: "Requested during OAuth authorization; read-only.",
    },
    {
      name: "cloud_recording:read",
      rationale: c(
        "Allows reading cloud recording metadata and retrieving download tokens for recording files and audio transcripts.",
        "zoom_api",
      ),
      condition: "Requested during OAuth authorization; read-only.",
    },
    {
      name: "user:read",
      rationale: c(
        "Allows reading user profile information to identify the host and resolve user ID needed for meeting endpoints.",
        "zoom_api",
      ),
      condition: "Requested during OAuth authorization; read-only.",
    },
    {
      name: "meeting:write (excluded)",
      rationale: c(
        "Allows creating, modifying, and deleting meetings. Excluded to maintain least privilege.",
        "zoom_api",
      ),
      condition: "Explicitly excluded.",
    },
    {
      name: "recording:write (excluded)",
      rationale: c(
        "Allows deleting recordings and modifying recording settings. Excluded to maintain least privilege.",
        "zoom_api",
      ),
      condition: "Explicitly excluded.",
    },
  ],
  steps: [
    {
      id: "create-marketplace-app",
      title: "Create an app in Zoom App Marketplace",
      detail: c(
        "Navigate to marketplace.zoom.us/develop/create. Choose OAuth or Server-to-Server OAuth depending on whether user delegation or account-level access is required.",
        "zoom_create",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.zoom.us/docs/integrations/create/",
      completion:
        "App created with Client ID and Client Secret generated.",
      dependsOn: [],
    },
    {
      id: "configure-app-credentials",
      title: "Configure redirect URLs and OAuth credentials",
      detail: c(
        "In app settings, add OAuth redirect URL and allowed domain list for the authentication callback.",
        "zoom_oauth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.zoom.us/docs/integrations/oauth/",
      completion:
        "Redirect URLs saved and credentials stored in backend secrets.",
      dependsOn: ["create-marketplace-app"],
    },
    {
      id: "add-granular-scopes",
      title: "Select granular read scopes",
      detail: c(
        "In Scopes tab, add meeting:read, cloud_recording:read, and user:read. Avoid adding write or management scopes.",
        "zoom_create",
        "zoom_api",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.zoom.us/docs/integrations/create/",
      completion: "Scopes configured and documented.",
      dependsOn: ["create-marketplace-app"],
    },
    {
      id: "authorize-zoom-user",
      title: "Direct user to Zoom authorization screen",
      detail: c(
        "Send user to https://zoom.us/oauth/authorize with response_type=code, client_id, and redirect_uri to obtain consent.",
        "zoom_oauth",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://developers.zoom.us/docs/integrations/oauth/",
      completion:
        "User or admin grants consent; authorization code returned to callback URL.",
      dependsOn: ["configure-app-credentials", "add-granular-scopes"],
    },
    {
      id: "exchange-code-for-tokens",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Call POST https://zoom.us/oauth/token with grant_type=authorization_code, code, redirect_uri, and Basic auth header containing Client ID and Secret.",
        "zoom_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.zoom.us/docs/integrations/oauth/",
      completion:
        "Access token (1-hour lifespan) and refresh token securely stored.",
      dependsOn: ["authorize-zoom-user"],
    },
    {
      id: "fetch-meetings-and-recordings",
      title: "Query meetings and cloud recordings from Zoom REST API",
      detail: c(
        "Call GET https://api.zoom.us/v2/users/me/meetings and GET https://api.zoom.us/v2/meetings/{meetingId}/recordings using the Bearer token.",
        "zoom_api",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.zoom.us/docs/api/using-zoom-apis/",
      completion:
        "Meeting schedule and recording download metadata successfully retrieved.",
      dependsOn: ["exchange-code-for-tokens"],
    },
    {
      id: "implement-rate-limiting",
      title: "Implement rate limiting and backoff strategy",
      detail: c(
        "Zoom limits requests based on endpoint tier (Light, Medium, Heavy) and account type. Track rate limit headers and handle HTTP 429 backoff.",
        "zoom_limits",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.zoom.us/docs/api/rate-limits/",
      completion:
        "Client handles rate limits and retries gracefully.",
      dependsOn: ["fetch-meetings-and-recordings"],
    },
    {
      id: "refresh-token-lifecycle",
      title: "Implement automated token refresh routine",
      detail: c(
        "Implement refresh flow calling POST https://zoom.us/oauth/token with grant_type=refresh_token before the 1-hour access token expires.",
        "zoom_oauth",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.zoom.us/docs/integrations/oauth/",
      completion:
        "Automated refresh logic ensures uninterrupted background polling.",
      dependsOn: ["exchange-code-for-tokens"],
    },
    {
      id: "marketplace-publishing-review",
      title: "Submit app for Zoom App Marketplace review (if public)",
      detail: c(
        "If distributing outside your account, submit for marketplace review with functional test documentation, privacy policy, and security scan.",
        "zoom_publish",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.zoom.us/docs/distribute/app-review-process/",
      completion:
        "App approved and published to Zoom App Marketplace.",
      dependsOn: ["implement-rate-limiting"],
    },
  ],
  approvals: [
    {
      title: "User Consent / Account Admin Consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "The authorizing user or account administrator grants consent to read meetings and recordings.",
        "zoom_oauth",
      ),
    },
    {
      title: "Zoom Account Admin Pre-approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Account administrators can restrict third-party apps and require pre-approval before users can install.",
        "zoom_create",
        "unknown",
      ),
    },
    {
      title: "Zoom Marketplace Review",
      kind: "distribution",
      owner: "provider",
      detail: c(
        "Public apps must pass technical, functional, and security reviews before being published on the Zoom Marketplace.",
        "zoom_publish",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Marketplace app creation + OAuth handshake + meeting/recording read test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Existing Zoom account with cloud recording; excludes building summarization models.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Zoom account configuration and cloud recording enablement",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Verifying plan tier and enabling cloud recording in Zoom web portal.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Zoom Marketplace app review turnaround",
      value: "Unknown; provider-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only for public marketplace publishing, not internal account apps.",
      evidenceIds: ["zoom_publish", "unknown"],
    },
  ],
  blockers: [
    {
      title: "No Cloud Recordings Available (HTTP 404)",
      recovery: c(
        "Ensure cloud recording is enabled on the Zoom host account and that at least one recorded meeting has finished processing.",
        "zoom_api",
        "unknown",
      ),
      owner: "administrator",
    },
    {
      title: "Expired Access Token (HTTP 401)",
      recovery: c(
        "Zoom access tokens expire after 1 hour. Refresh token using grant_type=refresh_token.",
        "zoom_oauth",
      ),
      owner: "developer",
    },
    {
      title: "Rate Limit Exceeded (HTTP 429)",
      recovery: c(
        "Zoom enforces per-second and daily rate limits by plan. Inspect Retry-After header and apply exponential backoff.",
        "zoom_limits",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Log in to marketplace.zoom.us/develop/create and create an OAuth or Server-to-Server app.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "zoom_oauth_doc",
      "Zoom · OAuth 2.0 Overview",
      "https://developers.zoom.us/docs/integrations/oauth/",
    ),
    source(
      "zoom_api_doc",
      "Zoom · Using Zoom APIs",
      "https://developers.zoom.us/docs/api/using-zoom-apis/",
    ),
    source(
      "zoom_create_doc",
      "Zoom · Create an App in Marketplace",
      "https://developers.zoom.us/docs/integrations/create/",
    ),
    source(
      "zoom_limits_doc",
      "Zoom · Rate limits",
      "https://developers.zoom.us/docs/api/rate-limits/",
    ),
    source(
      "zoom_publish_doc",
      "Zoom · App review process",
      "https://developers.zoom.us/docs/distribute/app-review-process/",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed OAuth apps, but toolkit coverage for Zoom cloud recording downloads and granular read scopes was not verified.",
      conditions:
        "Scenario-specific; verify Zoom toolkit capabilities.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact, approval requirement, or review timeframe has not been verified against official documentation.",
      conditions:
        "Confirm against current Zoom documentation or administrative policies.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for setup and minimal read verification, not an observed execution duration.",
      conditions:
        "Experienced developer with working backend and Zoom Pro/Business account.",
      testId: null,
    },
    {
      id: "zoom_oauth",
      kind: "official_docs",
      sourceIds: ["zoom_oauth_doc"],
      note: "Zoom documents OAuth 2.0 authorization code flow, token exchange endpoint (/oauth/token), 1-hour access token lifespan, and refresh token rotation.",
      conditions: "Requires secure client credentials handling.",
      testId: null,
    },
    {
      id: "zoom_api",
      kind: "official_docs",
      sourceIds: ["zoom_api_doc"],
      note: "Zoom REST API v2 provides endpoints for user meetings (/v2/users/{userId}/meetings) and meeting recordings (/v2/meetings/{meetingId}/recordings) requiring meeting:read, cloud_recording:read, and user:read scopes.",
      conditions:
        "Requires valid Bearer token and cloud recording enabled on the host account.",
      testId: null,
    },
    {
      id: "zoom_create",
      kind: "official_docs",
      sourceIds: ["zoom_create_doc"],
      note: "Zoom App Marketplace supports creating OAuth apps and Server-to-Server OAuth apps with granular permission scopes.",
      conditions: "Requires Zoom developer privileges.",
      testId: null,
    },
    {
      id: "zoom_limits",
      kind: "official_docs",
      sourceIds: ["zoom_limits_doc"],
      note: "Zoom enforces rate limits grouped into Light, Medium, and Heavy categories, returning HTTP 429 when limits are reached.",
      conditions:
        "Applications must monitor headers and handle 429 status codes.",
      testId: null,
    },
    {
      id: "zoom_publish",
      kind: "official_docs",
      sourceIds: ["zoom_publish_doc"],
      note: "Zoom Marketplace publishing requires functional review, documentation, privacy policy, and technical review.",
      conditions:
        "Applies to public apps distributed across multiple Zoom accounts.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect Zoom OAuth 2.0 documentation, REST API v2 reference, rate limits guide, and Marketplace publishing guide.",
      observation:
        "Zoom documents OAuth 2.0 code exchange, 1-hour access token expiration, REST API endpoints for meetings and cloud recordings, and marketplace review guidelines. No live connection was initiated.",
      outcome: "observed",
      stoppedAt: "Before authenticated account or app creation.",
      humanNext:
        "Create an OAuth app in the Zoom App Marketplace and configure credentials.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request Zoom Marketplace app creation portal at https://marketplace.zoom.us/develop/create without credentials.",
      observation:
        "The page redirected to Zoom sign-in. An active Zoom account is required.",
      outcome: "blocked",
      stoppedAt: "Interactive login screen.",
      humanNext:
        "Sign in to marketplace.zoom.us with your Zoom credentials.",
    },
  ],
  unresolvedQuestions: [
    "Will the assistant run as a user-level OAuth app or an organization-wide Server-to-Server OAuth app?",
    "Does the host account have sufficient cloud storage and recording transcription enabled?",
    "Does Composio's Zoom toolkit support retrieving cloud recording download tokens?",
  ],
  researchedAt: at,
};
