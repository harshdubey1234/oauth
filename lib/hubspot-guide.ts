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

export const hubspotGuide: Guide = {
  id: "hubspot",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "HubSpot",
    domain: "hubspot.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read contacts and deals from a CRM for an AI sales assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read CRM contacts and deals for an AI sales assistant",
  summary:
    "HubSpot uses OAuth 2.0 authorization code flow with short-lived access tokens (30 minutes) and persistent refresh tokens. Register a developer app in a HubSpot developer account, request granular CRM read scopes (crm.objects.contacts.read and crm.objects.deals.read), and query the CRM v3 API at https://api.hubapi.com/crm/v3/.",
  assumptions: [
    "The AI sales assistant needs read-only access to CRM contacts and deals to generate sales briefings and customer interaction context.",
    "Initial development and verification occur within a dedicated HubSpot developer test portal rather than a production customer portal.",
    "HubSpot public apps require a Developer Account to manage client credentials, redirect URLs, and scope definitions.",
    "Access tokens expire after 30 minutes; backend services must persist refresh tokens and automate token rotation.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "HubSpot implements OAuth 2.0 authorization code grant flow with short-lived access tokens (expire in 30 minutes) and persistent refresh tokens for API calls.",
      "hubspot_oauth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed OAuth apps, but toolkit coverage for HubSpot CRM v3 contacts and deals read scopes was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Create an app in a HubSpot Developer Account, configure redirect URLs and granular scopes (crm.objects.contacts.read, crm.objects.deals.read), install into a developer test portal to obtain authorization code, exchange for tokens, and fetch records from CRM v3 endpoints.",
    "hubspot_oauth",
    "hubspot_crm",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Set up a free HubSpot developer account and test portal to test the authorization flow and query sample contacts and deals. No live connection has been made in this guide.",
      "hubspot_oauth",
      "unknown",
    ),
    nextAction:
      "Create a HubSpot developer account at developers.hubspot.com and spawn a developer test account.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Internal organization use requires portal super admin installation approval; broad multi-customer public distribution requires meeting HubSpot App Marketplace listing requirements and undergoing formal review.",
      "hubspot_marketplace",
      "unknown",
    ),
    nextAction:
      "Decide between direct install URL distribution for select organizations or public App Marketplace submission.",
  },
  prerequisites: [
    {
      title: "HubSpot Developer Account and Test Portal",
      owner: "developer",
      detail: c(
        "A HubSpot developer account is required to create public apps, configure OAuth credentials, and generate isolated developer test portals.",
        "hubspot_oauth",
      ),
    },
    {
      title: "Target portal Super Admin privileges",
      owner: "administrator",
      detail: c(
        "Installing a HubSpot integration into a target CRM portal requires Super Admin permissions or explicit App Marketplace install permissions.",
        "hubspot_oauth",
        "unknown",
      ),
    },
    {
      title: "Secure backend token storage and refresh worker",
      owner: "developer",
      detail: c(
        "HubSpot access tokens expire every 30 minutes. Backend infrastructure must securely store client secret and refresh tokens and refresh access tokens proactively.",
        "hubspot_oauth",
        "effort",
      ),
    },
  ],
  permissions: [
    {
      name: "crm.objects.contacts.read",
      rationale: c(
        "Grants read access to contact properties, associations, and timelines. Required to fetch CRM contact profiles for sales briefings.",
        "hubspot_crm",
      ),
      condition:
        "Requested during OAuth consent; excludes contact creation, deletion, or editing.",
    },
    {
      name: "crm.objects.deals.read",
      rationale: c(
        "Grants read access to deals, pipelines, stages, and amounts. Required to analyze active sales opportunities.",
        "hubspot_crm",
      ),
      condition:
        "Requested during OAuth consent; excludes modifying deal stages or values.",
    },
    {
      name: "crm.objects.contacts.write (excluded)",
      rationale: c(
        "Allows creating and editing contact records. The sales assistant is strictly read-only, so write scope must be omitted.",
        "hubspot_crm",
      ),
      condition: "Excluded to enforce least privilege access.",
    },
    {
      name: "crm.objects.deals.write (excluded)",
      rationale: c(
        "Allows modifying sales pipeline deals. Omitted to prevent unauthorized updates to deal data.",
        "hubspot_crm",
      ),
      condition: "Excluded to enforce least privilege access.",
    },
  ],
  steps: [
    {
      id: "create-dev-portal",
      title: "Create developer account and test portal",
      detail: c(
        "Register at developers.hubspot.com to obtain a HubSpot developer account, then create an isolated developer test portal preloaded with synthetic CRM data.",
        "hubspot_oauth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.hubspot.com/docs/api-reference/legacy/authentication/oauth-tokens/v1/guide.md",
      completion:
        "Developer account and test portal created with admin credentials.",
      dependsOn: [],
    },
    {
      id: "create-app-credentials",
      title: "Create developer app and configure OAuth",
      detail: c(
        "In the Developer Account, navigate to Apps > Create app. Set the app name, redirect URL, and note the Client ID and Client Secret.",
        "hubspot_oauth_quickstart",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.hubspot.com/docs/guides/apps/authentication/oauth-quickstart-guide",
      completion:
        "App registered with Client ID and Client Secret stored securely.",
      dependsOn: ["create-dev-portal"],
    },
    {
      id: "configure-granular-scopes",
      title: "Configure granular CRM read scopes",
      detail: c(
        "Under the app's Auth settings, add crm.objects.contacts.read and crm.objects.deals.read to requested scopes. Do not request write permissions.",
        "hubspot_oauth_quickstart",
        "hubspot_crm",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.hubspot.com/docs/guides/apps/authentication/oauth-quickstart-guide",
      completion:
        "Granular scopes assigned and saved in the developer app settings.",
      dependsOn: ["create-app-credentials"],
    },
    {
      id: "generate-install-url",
      title: "Construct installation URL and prompt user consent",
      detail: c(
        "Generate the authorization URL: https://app.hubspot.com/oauth/authorize with client_id, redirect_uri, and scopes. Direct the portal admin to authorize access to the test portal.",
        "hubspot_oauth_quickstart",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://developers.hubspot.com/docs/guides/apps/authentication/oauth-quickstart-guide",
      completion:
        "Super admin grants consent and browser redirects to callback URL with auth code.",
      dependsOn: ["configure-granular-scopes"],
    },
    {
      id: "exchange-tokens",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Make a POST request to https://api.hubapi.com/oauth/v1/token with grant_type=authorization_code, client_id, client_secret, redirect_uri, and code to receive access_token and refresh_token.",
        "hubspot_oauth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.hubspot.com/docs/api-reference/legacy/authentication/oauth-tokens/v1/guide.md",
      completion:
        "Access token (30-minute expiry) and refresh token received and stored securely in backend.",
      dependsOn: ["generate-install-url"],
    },
    {
      id: "fetch-contacts-and-deals",
      title: "Query CRM v3 contacts and deals endpoints",
      detail: c(
        "Call GET https://api.hubapi.com/crm/v3/objects/contacts and GET https://api.hubapi.com/crm/v3/objects/deals using the Bearer access token to fetch CRM records.",
        "hubspot_crm",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide.md",
      completion:
        "Contact and deal objects retrieved and parsed by the AI sales assistant pipeline.",
      dependsOn: ["exchange-tokens"],
    },
    {
      id: "implement-token-refresh",
      title: "Implement automated token refresh routine",
      detail: c(
        "Build backend logic to refresh access tokens before their 30-minute expiration by calling POST https://api.hubapi.com/oauth/v1/token with grant_type=refresh_token.",
        "hubspot_oauth",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.hubspot.com/docs/api-reference/legacy/authentication/oauth-tokens/v1/guide.md",
      completion:
        "Automated refresh worker operates continuously without disrupting user workflows.",
      dependsOn: ["exchange-tokens"],
    },
    {
      id: "marketplace-submission",
      title: "Prepare and submit for HubSpot App Marketplace listing",
      detail: c(
        "If offering the integration publicly, complete listing requirements including documentation, terms of service, privacy policy, and submit for HubSpot review.",
        "hubspot_marketplace",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://developers.hubspot.com/docs/guides/apps/marketplace/listing-your-app",
      completion:
        "App review approved and listed in the HubSpot App Marketplace.",
      dependsOn: ["implement-token-refresh"],
    },
  ],
  approvals: [
    {
      title: "Portal Super Admin Consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "A HubSpot Super Admin or authorized user must review requested scopes and approve app installation on the target portal.",
        "hubspot_oauth",
      ),
    },
    {
      title: "HubSpot App Marketplace Review",
      kind: "distribution",
      owner: "provider",
      detail: c(
        "Public listing on the HubSpot App Marketplace requires technical, security, and content review by the HubSpot App Partner team.",
        "hubspot_marketplace",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Developer app setup + OAuth handshake + CRM v3 read test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Existing backend service and test portal access; excludes building AI summarization features.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "HubSpot developer account and test portal creation",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Creating free developer account and generating test account populated with sample CRM data.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "HubSpot App Marketplace listing review",
      value: "Unknown; provider-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only for public App Marketplace distribution, not direct install URL integrations.",
      evidenceIds: ["hubspot_marketplace", "unknown"],
    },
  ],
  blockers: [
    {
      title: "Access Token Expiration (HTTP 401)",
      recovery: c(
        "HubSpot access tokens expire in 30 minutes. Catch 401 errors and invoke the token refresh flow using grant_type=refresh_token.",
        "hubspot_oauth",
      ),
      owner: "developer",
    },
    {
      title: "Insufficient Scope Permissions (HTTP 403)",
      recovery: c(
        "Ensure the app has crm.objects.contacts.read and crm.objects.deals.read configured in app settings and requested during the authorization step.",
        "hubspot_oauth_quickstart",
        "hubspot_crm",
      ),
      owner: "developer",
    },
    {
      title: "HubSpot API Rate Limits (HTTP 429)",
      recovery: c(
        "HubSpot enforces rate limits per second and per day depending on portal tier. Implement exponential backoff when encountering HTTP 429 responses.",
        "hubspot_oauth",
        "unknown",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Register a developer account at developers.hubspot.com and create a developer test portal.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "hubspot_oauth_overview",
      "HubSpot · Manage OAuth access tokens (v1 APIs)",
      "https://developers.hubspot.com/docs/api-reference/legacy/authentication/oauth-tokens/v1/guide.md",
    ),
    source(
      "hubspot_oauth_quickstart",
      "HubSpot · OAuth Quickstart Guide",
      "https://developers.hubspot.com/docs/guides/apps/authentication/oauth-quickstart-guide",
    ),
    source(
      "hubspot_contacts_api",
      "HubSpot · CRM API: Contacts",
      "https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide.md",
    ),
    source(
      "hubspot_scope_doc",
      "HubSpot · Working with OAuth (scope example: crm.objects.contacts.read)",
      "https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth",
    ),
    source(
      "hubspot_marketplace_listing",
      "HubSpot · Listing your app in the App Marketplace",
      "https://developers.hubspot.com/docs/guides/apps/marketplace/listing-your-app",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed auth toolkits, but coverage for HubSpot CRM v3 contacts and deals read scopes was not verified.",
      conditions:
        "Scenario-specific; verify HubSpot toolkit capabilities.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact or approval requirement has not been verified against official documentation.",
      conditions:
        "Confirm against current HubSpot documentation or admin console.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for setup and minimal read verification, not an observed execution duration.",
      conditions:
        "Experienced developer with working backend and HubSpot account.",
      testId: null,
    },
    {
      id: "hubspot_oauth",
      kind: "official_docs",
      sourceIds: ["hubspot_oauth_overview"],
      note: "HubSpot documents the OAuth 2.0 authorization code flow, token exchange endpoint (/oauth/v1/token), 30-minute access token lifespan, and refresh token usage.",
      conditions:
        "Requires secure server-side client secret and refresh token management.",
      testId: null,
    },
    {
      id: "hubspot_oauth_quickstart",
      kind: "official_docs",
      sourceIds: ["hubspot_oauth_quickstart"],
      note: "The quickstart guide details app registration in the Developer Account, redirect URL setup, scope selection, and authorization URL formatting.",
      conditions: "App must be created in a HubSpot Developer Account.",
      testId: null,
    },
    {
      id: "hubspot_crm",
      kind: "official_docs",
      sourceIds: ["hubspot_contacts_api", "hubspot_scope_doc"],
      note: "HubSpot's CRM API serves contacts at /crm/v3/objects/contacts; HubSpot's OAuth guide uses crm.objects.contacts.read as the contact-read scope. Deal endpoints and their scopes were not re-confirmed in this recheck.",
      conditions:
        "Requires valid Bearer access token with corresponding read scope.",
      testId: null,
    },
    {
      id: "hubspot_marketplace",
      kind: "official_docs",
      sourceIds: ["hubspot_marketplace_listing"],
      note: "HubSpot App Marketplace publishing requires listing review, verified app functionality, security adherence, and legal documentation.",
      conditions: "Applies to public apps distributed through the marketplace.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect HubSpot OAuth 2.0 documentation, CRM v3 API endpoints, and marketplace listing guide.",
      observation:
        "HubSpot documents OAuth 2.0 authorization code flow, short 30-minute access token lifespan, granular CRM scopes, and marketplace review requirements. No live connection was initiated.",
      outcome: "observed",
      stoppedAt: "Before authenticated account or app creation.",
      humanNext:
        "Create a developer account and configure an app in the HubSpot developer portal.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request HubSpot developer portal at https://app.hubspot.com/developer/ without credentials.",
      observation:
        "The page redirected to HubSpot interactive login. Authenticated developer session is required.",
      outcome: "blocked",
      stoppedAt: "Interactive login screen.",
      humanNext: "Log in to your HubSpot developer account.",
    },
  ],
  unresolvedQuestions: [
    "Will the AI assistant be deployed via direct install URL to specific customer portals or published broadly on the HubSpot App Marketplace?",
    "Does the backend application implement automated token refreshing every 30 minutes before token expiration?",
    "Does Composio's managed HubSpot integration support granular crm.objects.contacts.read and crm.objects.deals.read scopes?",
  ],
  researchedAt: at,
};
