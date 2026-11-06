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

export const googleDriveGuide: Guide = {
  id: "google-drive",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Google Drive",
    domain: "drive.google.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read and search shared drive files for an AI document assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read and search shared drive files for an AI document assistant",
  summary:
    "Google Drive API v3 uses Google OAuth 2.0 web-server authorization. Request drive.readonly (classified as a Sensitive scope, distinct from restricted scopes like full drive). Querying shared drive files requires setting supportsAllDrives=true and includeItemsFromAllDrives=true on files.list endpoints. External Testing mode supports up to 100 test users with 7-day token expiration.",
  assumptions: [
    "The AI document assistant searches and indexes documents stored in Google Workspace Shared Drives (formerly Team Drives).",
    "Google classifies drive.readonly as a Sensitive scope (requiring sensitive-scope review for external customer launch, but permitted for internal organizations and up to 100 test users).",
    "Calls to files.list must pass supportsAllDrives=true, includeItemsFromAllDrives=true, and corpora=allDrives to discover items in Shared Drives.",
    "External Testing mode limits projects to 100 configured test users with a 7-day token authorization lifespan.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Google supports OAuth 2.0 authorization code flow for web applications. The drive.readonly scope provides read access across user and shared drives but is classified as a sensitive scope.",
      "drive_auth",
      "google_scopes",
      "google_web",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but support for shared drive search parameters (supportsAllDrives) and organizational Workspace delegation was not verified in this research.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Configure a Google Cloud project with Google Drive API enabled. Request drive.readonly using OAuth 2.0 web-server flow with access_type=offline. Use External Testing with designated test accounts for development, or set audience to Internal for organization deployment.",
    "drive_auth",
    "google_scopes",
    "google_web",
    "drive_sdk",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create a development Cloud project, configure the consent screen with External Testing, add up to 100 test accounts, and query a test Shared Drive using files.list with supportsAllDrives=true. No live connection has been executed in this guide.",
      "drive_auth",
      "google_scopes",
      "unknown",
    ),
    nextAction:
      "Open Google Cloud Console, enable Google Drive API, and configure OAuth consent screen audience.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "For internal organization launch, Workspace administrators can approve the client ID without sensitive scope verification. External multi-tenant launch requires submitting Google Sensitive Scope verification with video demonstration and privacy policy.",
      "drive_auth",
      "google_scopes",
      "unknown",
    ),
    nextAction:
      "Determine whether the assistant is deployed strictly for internal Workspace users or distributed externally, and configure Workspace API controls accordingly.",
  },
  prerequisites: [
    {
      title: "Google Cloud project with Drive API enabled",
      owner: "developer",
      detail: c(
        "A Google Cloud project with billing/monitoring and Google Drive API (drive.googleapis.com) enabled in the API library.",
        "drive_sdk",
      ),
    },
    {
      title: "Google Workspace Shared Drive with sample files",
      owner: "administrator",
      detail: c(
        "A dedicated organizational Shared Drive populated with test documents and configured with appropriate member access.",
        "drive_sdk",
        "drive_search",
        "unknown",
      ),
    },
    {
      title: "Test user accounts registered in Cloud Console",
      owner: "developer",
      detail: c(
        "For External Testing mode, up to 100 test user email addresses must be explicitly added to the OAuth consent screen test user list.",
        "google_scopes",
        "drive_auth",
      ),
    },
  ],
  permissions: [
    {
      name: "https://www.googleapis.com/auth/drive.readonly",
      rationale: c(
        "Allows reading file metadata and downloading document contents across My Drive and Shared Drives. Classified by Google as a Sensitive scope.",
        "drive_auth",
        "google_scopes",
      ),
      condition:
        "Requested during OAuth consent; required for searching and indexing document text.",
    },
    {
      name: "https://www.googleapis.com/auth/drive.metadata.readonly (alternative)",
      rationale: c(
        "Allows viewing file metadata without content access. Insufficient if the assistant must index document text rather than file titles.",
        "drive_auth",
        "google_scopes",
      ),
      condition:
        "Alternative narrower scope when only file titles, modified dates, and MIME types are needed.",
    },
    {
      name: "https://www.googleapis.com/auth/drive (excluded)",
      rationale: c(
        "Grants full read, write, and delete permissions across all Drive files and is classified as Restricted. Excluded to observe least privilege.",
        "google_scopes",
      ),
      condition:
        "Explicitly excluded; read-only assistant does not require modification access.",
    },
  ],
  steps: [
    {
      id: "create-cloud-project",
      title: "Configure Cloud project and enable Drive API",
      detail: c(
        "Create or select a Cloud project in Google Cloud Console, navigate to APIs & Services -> Library, and enable Google Drive API (drive.googleapis.com).",
        "drive_sdk",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.google.com/drive/api/guides/about-sdk",
      completion:
        "Google Cloud project active and Google Drive API enabled.",
      dependsOn: [],
    },
    {
      id: "configure-consent-screen",
      title: "Configure OAuth consent screen and audience",
      detail: c(
        "Configure OAuth consent screen in Google Auth Platform. Choose Internal (for Workspace organizations) or External (with Testing status) and specify app branding.",
        "drive_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.google.com/drive/api/guides/about-auth",
      completion:
        "Consent screen configured with app details, scopes, and target audience.",
      dependsOn: ["create-cloud-project"],
    },
    {
      id: "add-test-users",
      title: "Add test user accounts in External Testing mode",
      detail: c(
        "If using External audience in Testing mode, add up to 100 test user email addresses who are authorized to connect during development.",
        "google_scopes",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/drive/api/guides/about-auth",
      completion:
        "Designated test user accounts listed in Cloud Console; note that testing tokens expire after 7 days.",
      dependsOn: ["configure-consent-screen"],
    },
    {
      id: "create-web-oauth-client",
      title: "Create OAuth 2.0 Web Client credentials",
      detail: c(
        "Under Credentials, create an OAuth client ID of type Web application and configure authorized redirect URIs matching your backend callback.",
        "google_web",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "Client ID and client secret generated; authorized redirect URIs recorded.",
      dependsOn: ["create-cloud-project"],
    },
    {
      id: "initiate-authorization",
      title: "Redirect user to Google OAuth authorization endpoint",
      detail: c(
        "Send user to https://accounts.google.com/o/oauth2/v2/auth with client_id, redirect_uri, scope=https://www.googleapis.com/auth/drive.readonly, access_type=offline, prompt=consent, and state.",
        "google_web",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "User reaches Google consent screen requesting offline drive.readonly access.",
      dependsOn: ["add-test-users", "create-web-oauth-client"],
    },
    {
      id: "user-consent",
      title: "Test user approves Drive read access",
      detail: c(
        "The authorized test user reviews the consent screen and approves read permissions for Google Drive.",
        "drive_auth",
        "google_web",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "User approves access; Google redirects to callback with an authorization code.",
      dependsOn: ["initiate-authorization"],
    },
    {
      id: "exchange-tokens",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Send POST to https://oauth2.googleapis.com/token with code, client_id, client_secret, redirect_uri, and grant_type=authorization_code.",
        "google_web",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      completion:
        "Access token and refresh token saved in encrypted backend credentials store.",
      dependsOn: ["user-consent"],
    },
    {
      id: "search-shared-drives",
      title: "Search files across Shared Drives with API v3",
      detail: c(
        "Call GET https://www.googleapis.com/drive/v3/files with supportsAllDrives=true, includeItemsFromAllDrives=true, corpora=allDrives, and query parameter q.",
        "drive_search",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.google.com/drive/api/guides/search-files",
      completion:
        "Shared Drive files successfully queried and verified against test documents.",
      dependsOn: ["exchange-tokens"],
    },
    {
      id: "workspace-admin-approval",
      title: "Configure Workspace API controls for organization access",
      detail: c(
        "For internal organization launch, Workspace administrator marks the app client ID as Trusted under Admin Console -> Security -> API controls.",
        "drive_auth",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://developers.google.com/drive/api/guides/about-auth",
      completion:
        "Workspace domain administrator approves third-party API access policy.",
      dependsOn: ["configure-consent-screen"],
    },
    {
      id: "sensitive-verification",
      title: "Submit Google sensitive scope verification (if external)",
      detail: c(
        "If launching to external Google accounts outside the Workspace domain, submit sensitive scope verification with demonstration video and privacy policy.",
        "google_scopes",
        "drive_auth",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.google.com/identity/protocols/oauth2/scopes",
      completion:
        "Verification package submitted or internal-only distribution confirmed.",
      dependsOn: ["configure-consent-screen"],
    },
  ],
  approvals: [
    {
      title: "Google account consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing user approves access to view Google Drive files and metadata on Google's consent screen.",
        "drive_auth",
        "google_web",
      ),
    },
    {
      title: "Workspace API access control",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Google Workspace administrators can block unapproved third-party apps from accessing organizational Drive files.",
        "drive_auth",
        "unknown",
      ),
    },
    {
      title: "Google sensitive scope verification",
      kind: "verification",
      owner: "provider",
      detail: c(
        "External publication requesting drive.readonly requires Google sensitive-scope verification, brand verification, and a privacy policy review.",
        "google_scopes",
        "drive_auth",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Cloud project setup, consent screen, and shared drive query test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has Google Cloud access and a designated test user account.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Shared Drive creation and document staging",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Setting up a test Google Shared Drive with sample documents and adding test user memberships.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Google Sensitive Scope verification review",
      value: "Unknown; typically several weeks if external",
      basis: "unknown",
      assumptions:
        "Only applies if distributing to external Google accounts. Not required for Internal Workspace audience.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "Shared Drive Files Omitted from Search Results",
      recovery: c(
        "Google Drive API v3 requires supportsAllDrives=true and includeItemsFromAllDrives=true on files queries to return files inside shared drives.",
        "drive_search",
      ),
      owner: "developer",
    },
    {
      title: "7-Day Refresh Token Expiration in External Testing",
      recovery: c(
        "OAuth tokens issued to test users under External Testing status expire after 7 days. Reauthorize for ongoing testing or switch audience to Internal if inside Google Workspace.",
        "google_scopes",
        "drive_auth",
      ),
      owner: "developer",
    },
    {
      title: "Google Unverified App Warning Screen",
      recovery: c(
        "External apps without verification display an unverified app warning. For organization launch, set audience to Internal or complete sensitive scope verification.",
        "google_scopes",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Open Google Cloud Console, enable Google Drive API, and configure OAuth consent screen audience.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "drive_auth_doc",
      "Google Drive · About Authentication and Authorization",
      "https://developers.google.com/drive/api/guides/about-auth",
    ),
    source(
      "drive_search_doc",
      "Google Drive · Search for Files and Folders",
      "https://developers.google.com/drive/api/guides/search-files",
    ),
    source(
      "google_scopes_doc",
      "Google Identity · OAuth 2.0 Scopes for Google APIs",
      "https://developers.google.com/identity/protocols/oauth2/scopes",
    ),
    source(
      "drive_sdk_doc",
      "Google Drive · Drive API Overview & Shared Drives",
      "https://developers.google.com/drive/api/guides/about-sdk",
    ),
    source(
      "google_web_doc",
      "Google Identity · Using OAuth 2.0 for Web Server Applications",
      "https://developers.google.com/identity/protocols/oauth2/web-server",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific support for Drive API shared drive search parameters must be confirmed.",
      conditions:
        "Scenario-specific; check Composio toolkit capabilities before choosing managed auth.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or Workspace policy requirement has not been established from official documentation.",
      conditions:
        "Confirm with your Google Workspace administrator or Cloud Console.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for configuration and minimal read test, not an observed execution duration.",
      conditions:
        "Experienced developer; working Google Cloud project and test account already available.",
      testId: null,
    },
    {
      id: "drive_auth",
      kind: "official_docs",
      sourceIds: ["drive_auth_doc"],
      note: "Google Drive API uses Google OAuth 2.0 authorization code flow. Sensitive scopes like drive.readonly grant read access to all files including shared drives, but require sensitive scope review before public launch.",
      conditions:
        "Requires a Google Cloud project with Google Drive API enabled.",
      testId: null,
    },
    {
      id: "drive_search",
      kind: "official_docs",
      sourceIds: ["drive_search_doc"],
      note: "Drive API files.list endpoint supports structured query filtering (e.g. q='trashed = false'). Searching shared drives requires supportsAllDrives=true, includeItemsFromAllDrives=true, and corpora=allDrives.",
      conditions:
        "Authorizing user must be a member of the target shared drive.",
      testId: null,
    },
    {
      id: "google_scopes",
      kind: "official_docs",
      sourceIds: ["google_scopes_doc"],
      note: "drive.readonly is classified as a sensitive scope (requires Google verification for unverified external apps, but exempt for Internal organization audience or up to 100 test users in External Testing). Full drive scope is restricted.",
      conditions:
        "External testing mode limits projects to 100 configured test users with 7-day token expiration.",
      testId: null,
    },
    {
      id: "drive_sdk",
      kind: "official_docs",
      sourceIds: ["drive_sdk_doc"],
      note: "Google Drive API v3 handles shared drives, permissions, and file metadata. Enabling drive.googleapis.com in Google Cloud Console is required before issuing requests.",
      conditions:
        "Cloud project must have the Drive API enabled.",
      testId: null,
    },
    {
      id: "google_web",
      kind: "official_docs",
      sourceIds: ["google_web_doc"],
      note: "Google documents OAuth 2.0 web-server authorization code exchange via POST https://oauth2.googleapis.com/token with client_id, client_secret, code, and redirect_uri. Requesting access_type=offline yields a refresh token.",
      conditions:
        "Redirect URI must strictly match authorized redirect URIs in Google Cloud Console.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Google Drive API authentication, search files, scopes, and web-server documentation.",
      observation:
        "Documentation establishes drive.readonly sensitive-scope classification, supportsAllDrives=true requirement for Shared Drives, 100 test-user limit in External Testing mode, and 7-day token lifespan. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Google Cloud Console, enable Drive API, and configure an OAuth client.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request Google Cloud Console credentials page at https://console.cloud.google.com/apis/credentials without credentials.",
      observation:
        "The request redirects to Google sign-in; interactive authentication is required to access Cloud Console.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to Google Cloud Console with authorized project access.",
    },
  ],
  unresolvedQuestions: [
    "Is the intended audience Internal (Google Workspace domain) or External (multi-tenant customers)?",
    "Does the document assistant need to export Google Docs/Sheets to plain text via drive.files.export or only index binary files?",
    "Does Composio's managed Google Drive integration support shared drive query parameters (supportsAllDrives)?",
  ],
  researchedAt: at,
};
