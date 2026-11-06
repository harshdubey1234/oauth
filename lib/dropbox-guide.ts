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

export const dropboxGuide: Guide = {
  id: "dropbox",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Dropbox",
    domain: "dropbox.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read and index files from a team folder for an AI document search",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read and index files from a team folder for an AI document search",
  summary:
    "Dropbox implements OAuth 2.0 with PKCE and short-lived access tokens (4 hours). Applications must request token_access_type=offline to receive refresh tokens. In team environments, traversing team folders requires configuring the Dropbox-API-Path-Root header with the appropriate root namespace ID.",
  assumptions: [
    "The AI document search agent accesses a designated team folder inside a Dropbox Business or team account.",
    "Dropbox uses OAuth 2.0 with PKCE and defaults to short-lived access tokens (4 hours / 14,400 seconds).",
    "Acquiring a refresh token requires passing token_access_type=offline during the initial authorization request.",
    "Accessing team folders requires querying root namespace information and providing the Dropbox-API-Path-Root header on file operations.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Dropbox supports OAuth 2.0 authorization code flow with PKCE, short-lived tokens (4 hours), and refresh tokens when offline access is explicitly requested.",
      "dropbox_oauth",
      "dropbox_auth_types",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but support for Dropbox Business team-folder namespace routing and offline refresh token lifecycle was not verified in this research.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Register a scoped application in the Dropbox App Console. Request files.content.read, files.metadata.read, sharing.read, and account_info.read scopes with token_access_type=offline and PKCE. Use the Dropbox-API-Path-Root header to query team folders.",
    "dropbox_oauth",
    "dropbox_auth_types",
    "dropbox_team_files",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create a scoped app in the Dropbox App Console, configure read scopes and redirect URIs, and run a PKCE code exchange with offline access against a test team folder. No live API requests have been made in this guide.",
      "dropbox_oauth",
      "unknown",
    ),
    nextAction:
      "Open the Dropbox App Console at https://www.dropbox.com/developers/apps and create a new scoped application.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Team launch requires Dropbox production approval once 50 users link (development apps are capped and frozen after a two-week window), Dropbox Business team administrator approval for third-party integrations, automated token refresh prior to the 4-hour token expiry, and dynamic rate-limit backoff handling.",
      "dropbox_production",
      "dropbox_oauth",
      "dropbox_team_files",
      "unknown",
    ),
    nextAction:
      "Confirm team folder integration policies with the team administrator and implement automated 4-hour token refresh logic.",
  },
  prerequisites: [
    {
      title: "Dropbox Business account and App Console access",
      owner: "developer",
      detail: c(
        "A Dropbox Business account with developer access is needed to create apps and configure team-level scopes in the Dropbox App Console.",
        "dropbox_oauth",
      ),
    },
    {
      title: "Controlled test team folder and sample documents",
      owner: "administrator",
      detail: c(
        "A designated test team folder populated with sample documents allows safe indexing verification without exposing confidential team documents.",
        "dropbox_team_files",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets storage and PKCE helper",
      owner: "developer",
      detail: c(
        "Backend systems must generate SHA-256 PKCE challenges and securely store short-lived access tokens and persistent refresh tokens.",
        "dropbox_oauth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "files.content.read",
      rationale: c(
        "Enables downloading file contents to extract text for the AI document search index.",
        "dropbox_auth_types",
        "dropbox_http",
      ),
      condition:
        "Requested during OAuth consent; essential for reading document content.",
    },
    {
      name: "files.metadata.read",
      rationale: c(
        "Allows listing folder contents, inspecting file sizes, and tracking modification timestamps for index freshness.",
        "dropbox_auth_types",
        "dropbox_http",
      ),
      condition:
        "Requested during OAuth consent; essential for traversing folder trees.",
    },
    {
      name: "sharing.read",
      rationale: c(
        "Allows viewing shared folder structures and team folder membership details.",
        "dropbox_auth_types",
        "dropbox_team_files",
      ),
      condition:
        "Requested during OAuth consent; needed to identify shared team spaces.",
    },
    {
      name: "account_info.read",
      rationale: c(
        "Allows reading user account details and the root namespace ID needed to set the Dropbox-API-Path-Root header.",
        "dropbox_auth_types",
        "dropbox_team_files",
      ),
      condition:
        "Requested during OAuth consent; required for team folder path root resolution.",
    },
    {
      name: "files.content.write (excluded)",
      rationale: c(
        "Grants authority to create, edit, or overwrite team files. Excluded to maintain read-only search indexing integrity.",
        "dropbox_auth_types",
      ),
      condition:
        "Explicitly excluded to observe the principle of least privilege.",
    },
  ],
  steps: [
    {
      id: "create-dropbox-app",
      title: "Create scoped app in Dropbox App Console",
      detail: c(
        "Open https://www.dropbox.com/developers/apps, choose Scoped access and Full Dropbox (or team member file access), and give your app a descriptive name.",
        "dropbox_oauth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl: "https://developers.dropbox.com/oauth-guide",
      completion:
        "App registered; App key (client_id) and App secret obtained.",
      dependsOn: [],
    },
    {
      id: "configure-permissions",
      title: "Select read-only file and account permissions",
      detail: c(
        "In the Permissions tab, enable files.content.read, files.metadata.read, sharing.read, and account_info.read. Submit changes to save permissions.",
        "dropbox_auth_types",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://www.dropbox.com/developers/reference/auth-types",
      completion:
        "Required read-only scopes enabled in the Dropbox developer portal.",
      dependsOn: ["create-dropbox-app"],
    },
    {
      id: "generate-pkce",
      title: "Generate PKCE challenge and code verifier",
      detail: c(
        "Generate a cryptographic random code_verifier (43–128 characters) and compute its SHA-256 base64url-encoded code_challenge.",
        "dropbox_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.dropbox.com/oauth-guide",
      completion:
        "PKCE parameters created; code_verifier saved in backend session state.",
      dependsOn: ["configure-permissions"],
    },
    {
      id: "request-authorization",
      title: "Redirect user with offline access and PKCE",
      detail: c(
        "Send user to https://www.dropbox.com/oauth2/authorize with client_id, response_type=code, token_access_type=offline, code_challenge, and code_challenge_method=S256.",
        "dropbox_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.dropbox.com/oauth-guide",
      completion:
        "User is directed to the Dropbox consent page requesting offline refresh access.",
      dependsOn: ["generate-pkce"],
    },
    {
      id: "user-authorizes",
      title: "Team member grants file and team access",
      detail: c(
        "The authorizing team member reviews requested file reading permissions and grants access on the Dropbox consent screen.",
        "dropbox_oauth",
      ),
      owner: "user",
      path: "test",
      sourceUrl: "https://developers.dropbox.com/oauth-guide",
      completion:
        "User approves access; browser redirects to callback with authorization code.",
      dependsOn: ["request-authorization"],
    },
    {
      id: "exchange-offline-token",
      title: "Exchange authorization code for 4-hour token and refresh token",
      detail: c(
        "Send POST to https://api.dropboxapi.com/oauth2/token with code, client_id, client_secret, code_verifier, and grant_type=authorization_code.",
        "dropbox_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.dropbox.com/oauth-guide",
      completion:
        "Short-lived access token (expires in 14,400s) and refresh token secured in backend storage.",
      dependsOn: ["user-authorizes"],
    },
    {
      id: "resolve-path-root",
      title: "Resolve team folder root namespace",
      detail: c(
        "Call POST https://api.dropboxapi.com/2/users/get_current_account to retrieve root_info and obtain the root namespace ID for team folder traversal.",
        "dropbox_team_files",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.dropbox.com/dbx-team-files-guide",
      completion:
        "Root namespace identified and configured for subsequent API requests.",
      dependsOn: ["exchange-offline-token"],
    },
    {
      id: "index-test-files",
      title: "List and download files from test team folder",
      detail: c(
        "Call /2/files/list_folder and /2/files/download with the Dropbox-API-Path-Root header to traverse folder structure and retrieve document text.",
        "dropbox_http",
        "dropbox_team_files",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://www.dropbox.com/developers/documentation/http/documentation",
      completion:
        "Test team folder files listed and downloaded successfully for indexing verification.",
      dependsOn: ["resolve-path-root"],
    },
    {
      id: "refresh-token-service",
      title: "Implement automated token refresh routine",
      detail: c(
        "Automate token renewal via POST https://api.dropboxapi.com/oauth2/token with grant_type=refresh_token prior to the 4-hour access token expiration.",
        "dropbox_oauth",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl: "https://developers.dropbox.com/oauth-guide",
      completion:
        "Token refresh worker maintains active tokens without requiring user reauthorization.",
      dependsOn: ["exchange-offline-token"],
    },
    {
      id: "team-admin-governance",
      title: "Verify team folder integration governance",
      detail: c(
        "Confirm that Dropbox Business team policies permit member-authorized integrations on shared team spaces and review compliance requirements.",
        "dropbox_team_files",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl: "https://developers.dropbox.com/dbx-team-files-guide",
      completion:
        "Team folder permissions and administrative governance documented.",
      dependsOn: ["create-dropbox-app"],
    },
  ],
  approvals: [
    {
      title: "User OAuth consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing team member must approve access to file contents and metadata on the Dropbox OAuth consent screen.",
        "dropbox_oauth",
      ),
    },
    {
      title: "Production status (required once 50 users link)",
      kind: "distribution",
      owner: "provider",
      detail: c(
        "Development apps are capped at 500 linked users, and after the 50th link you have two weeks to apply for and receive production approval. Apply from the app's Settings tab (an app icon is required) before the team rollout reaches 50 people.",
        "dropbox_production",
      ),
    },
    {
      title: "Team administrator app approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Dropbox Business team administrators may require review and approval before third-party apps can access team folders.",
        "dropbox_team_files",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Dropbox PKCE setup and file indexing smoke test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has access to a Dropbox Business test team folder and backend server capable of PKCE generation.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Team folder creation and test document staging",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Populating a dedicated test team folder with sample documents for index testing.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Dropbox production approval, once 50 users link",
      value: "Two-week deadline from the 50th link; review duration not published",
      basis: "provider_published",
      assumptions:
        "Only the two-week window is published. Review starts after 50 linked users, so plan the application before the rollout reaches that size.",
      evidenceIds: ["dropbox_production"],
    },
    {
      label: "Team administrator app permission review",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only if team settings restrict third-party app installations across team folders.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "New team members can't connect after 50 users link",
      recovery: c(
        "Development status allows two weeks after the 50th linked user to obtain production approval; after that the app cannot link new users until approved, and unlinking users does not help. Apply for production (Settings → App configuration) as soon as the rollout approaches 50 users.",
        "dropbox_production",
      ),
      owner: "developer",
    },
    {
      title: "Missing Refresh Token (Access Token Expires in 4 Hours)",
      recovery: c(
        "Ensure token_access_type=offline was passed in the authorization request. Without it, Dropbox issues only a short-lived 4-hour token with no refresh token.",
        "dropbox_oauth",
      ),
      owner: "developer",
    },
    {
      title: "Path Root Namespace Mismatch (HTTP 409 path/not_found)",
      recovery: c(
        "Team folders require passing the Dropbox-API-Path-Root header with the root namespace ID. Query /2/users/get_current_account to obtain the correct namespace.",
        "dropbox_team_files",
      ),
      owner: "developer",
    },
    {
      title: "HTTP 429 Rate Limit Exceeded",
      recovery: c(
        "Dropbox dynamically throttles requests under load. Inspect the Retry-After response header and implement exponential backoff.",
        "dropbox_http",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open the Dropbox App Console at https://www.dropbox.com/developers/apps and create a scoped application.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "dropbox_oauth_doc",
      "Dropbox · OAuth 2.0 Guide",
      "https://developers.dropbox.com/oauth-guide",
    ),
    source(
      "dropbox_http_doc",
      "Dropbox · HTTP API Explorer & Documentation",
      "https://www.dropbox.com/developers/documentation/http/documentation",
    ),
    source(
      "dropbox_auth_types_doc",
      "Dropbox · Authentication Types & Scopes",
      "https://www.dropbox.com/developers/reference/auth-types",
    ),
    source(
      "dropbox_team_files_doc",
      "Dropbox · Team Files Guide",
      "https://developers.dropbox.com/dbx-team-files-guide",
    ),
    {
      id: "dropbox_devguide_doc",
      title: "Dropbox · Developer guide (development vs production status)",
      url: "https://docs.dropboxapi.com/dropbox-api/docs/developer-resources/developer-guide",
      retrievedAt: "2026-11-06T21:58:04.000Z",
      retrieval: "page",
      official: true,
    },
  ],
  evidence: [
    {
      id: "dropbox_production",
      kind: "official_docs",
      sourceIds: ["dropbox_devguide_doc"],
      note: "New apps start in development status, linked only to the developer's account; development apps can link up to 500 Dropbox users in total. Once an app links 50 users it has two weeks to apply for and receive production approval, or it cannot link new users until approved (unlinking users does not unfreeze it). Review does not start before 50 linked users and checks branding guidelines and terms; an app icon is required to apply.",
      conditions:
        "Applies to every Dropbox API app regardless of audience. Review duration is not published.",
      testId: null,
    },
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Dropbox team folder path root routing must be verified.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or team governance requirement has not been established from official documentation.",
      conditions:
        "Confirm with your Dropbox Business team administrator or developer console.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for configuration and minimal read test, not an observed execution duration.",
      conditions:
        "Experienced developer; working Dropbox Business account and test team folder already available.",
      testId: null,
    },
    {
      id: "dropbox_oauth",
      kind: "official_docs",
      sourceIds: ["dropbox_oauth_doc"],
      note: "Dropbox implements OAuth 2.0 with PKCE for code flows. Access tokens are short-lived (4 hours / 14,400 seconds). Requesting token_access_type=offline yields a refresh token for enduring access.",
      conditions:
        "App must be registered in the Dropbox App Console.",
      testId: null,
    },
    {
      id: "dropbox_auth_types",
      kind: "official_docs",
      sourceIds: ["dropbox_auth_types_doc"],
      note: "Dropbox scopes separate read and write access: files.content.read (read file contents), files.metadata.read (list files and folders), sharing.read (view shared and team folder memberships), and account_info.read (view user account details).",
      conditions:
        "Scopes must be configured in App Console and consented during authorization.",
      testId: null,
    },
    {
      id: "dropbox_http",
      kind: "official_docs",
      sourceIds: ["dropbox_http_doc"],
      note: "Dropbox REST endpoints operate on https://api.dropboxapi.com/2/ (RPC calls like files/list_folder) and https://content.dropboxapi.com/2/ (content downloads like files/download). Authentication uses Bearer tokens.",
      conditions:
        "File downloads require Dropbox-API-Arg headers containing file path or ID.",
      testId: null,
    },
    {
      id: "dropbox_team_files",
      kind: "official_docs",
      sourceIds: ["dropbox_team_files_doc"],
      note: "Accessing team folders in Dropbox Business requires setting the Dropbox-API-Path-Root header with the user root or team folder root namespace ID, retrieved via users/get_current_account.",
      conditions:
        "Team folder access depends on the authorizing member being granted access to the specific team folder.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Dropbox OAuth guide, HTTP endpoints, auth types, and team files documentation.",
      observation:
        "Documentation establishes PKCE requirements, 4-hour token expiry with offline refresh tokens, granular read scopes, and Dropbox-API-Path-Root header mechanics for team folders. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Dropbox and create a scoped app in the App Console.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Dropbox App Console at https://www.dropbox.com/developers/apps without credentials.",
      observation:
        "Access requires interactive Dropbox account sign-in to create or manage developer applications.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Dropbox account and create developer credentials.",
    },
  ],
  unresolvedQuestions: [
    "Does your Dropbox Business team enforce admin approval for custom developer apps?",
    "Does the document search assistant need webhooks (/files/list_folder/longpoll) for real-time document indexing?",
    "Does Composio's managed Dropbox toolkit support team folder root namespace routing?",
  ],
  researchedAt: at,
};
