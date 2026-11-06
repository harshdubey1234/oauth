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

export const notionGuide: Guide = {
  id: "notion",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Notion",
    domain: "notion.so",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read and search pages from a team workspace for an AI knowledge assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read and search Notion workspace pages for an AI knowledge assistant",
  summary:
    "Notion supports OAuth 2.0 Authorization Code Grant for public integrations and internal integration tokens for single workspaces. Crucially, integrations have no access to workspace content by default until workspace members explicitly share pages or databases with the integration.",
  assumptions: [
    "The AI knowledge assistant searches and reads page text, properties, and block structures without modifying or deleting workspace content.",
    "Testing begins in a dedicated team workspace using synthetic knowledge base documents explicitly shared with the integration.",
    "For multi-user organization deployment, a public OAuth 2.0 integration is used; for single-workspace internal tools, an internal integration token is an alternative.",
    "Workspace administrator settings allow members or admins to add integration connections to target pages.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Notion implements standard OAuth 2.0 Authorization Code Grant for public integrations, exchanging code via POST https://api.notion.com/v1/oauth/token with HTTP Basic Authentication. Internal integrations use direct workspace-scoped bearer tokens.",
      "notion_auth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Notion public OAuth versus internal integration tokens for this specific read-only assistant scenario was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "For multi-workspace organization deployment, implement the public OAuth 2.0 Authorization Code Grant and configure granular read capabilities. For initial single-workspace development, an internal integration token connected to test pages provides a rapid testing path without OAuth redirect infrastructure.",
    "notion_auth",
    "notion_create",
    "notion_start",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create an integration in the Notion developer portal, request Read content capability, and explicitly share a test page to verify search API responses. No live connection was executed in this guide.",
      "notion_create",
      "notion_start",
      "unknown",
    ),
    nextAction:
      "Navigate to notion.so/profile/integrations and create a new integration with Read content permissions.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Production deployment across team workspaces requires workspace admin approval of public integrations, user authorization consent, and an onboarding flow that instructs users to share target knowledge pages with the integration.",
      "notion_manage",
      "notion_start",
      "unknown",
    ),
    nextAction:
      "Verify workspace connection policies with workspace administrators and implement in-product sharing guidance for end users.",
  },
  prerequisites: [
    {
      title: "Notion account and workspace membership",
      owner: "developer",
      detail: c(
        "A valid Notion account with membership in a development workspace is needed to create integrations and access developer portal settings.",
        "notion_create",
      ),
    },
    {
      title: "Controlled knowledge base test pages",
      owner: "administrator",
      detail: c(
        "A dedicated test page or database populated with sample knowledge articles prevents exposing sensitive corporate documents during integration testing.",
        "notion_start",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets storage",
      owner: "developer",
      detail: c(
        "Public OAuth credentials (client ID and secret) and issued workspace bearer tokens must be stored securely in backend key storage.",
        "notion_auth",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "capability: Read content",
      rationale: c(
        "Allows the knowledge assistant to read page titles, block content, and database schemas across all pages explicitly shared with the integration.",
        "notion_create",
        "notion_start",
      ),
      condition:
        "Requested during integration setup; target pages must be shared with the connection in Notion UI.",
    },
    {
      name: "capability: Read comments",
      rationale: c(
        "Permits reading discussion threads and comments on pages shared with the integration, adding valuable conversational context to knowledge search.",
        "notion_create",
      ),
      condition:
        "Optional capability; request only if discussion threads are relevant to knowledge retrieval.",
    },
    {
      name: "capability: Read user information without email",
      rationale: c(
        "Allows reading user profile names and avatars to identify authors and editors of retrieved documents while respecting user privacy.",
        "notion_create",
      ),
      condition:
        "Configure read user information without email addresses to minimize sensitive data access.",
    },
    {
      name: "capability: Update content (excluded)",
      rationale: c(
        "Grants permission to modify or delete page blocks and database properties. Excluded because the knowledge assistant is strictly read-only.",
        "notion_create",
      ),
      condition:
        "Explicitly disabled under integration capabilities to preserve data integrity.",
    },
    {
      name: "capability: Insert content (excluded)",
      rationale: c(
        "Grants permission to create new pages or insert block content. Excluded to adhere to least privilege.",
        "notion_create",
      ),
      condition:
        "Explicitly disabled under integration capabilities.",
    },
  ],
  steps: [
    {
      id: "create-integration",
      title: "Register integration in Notion Developer Portal",
      detail: c(
        "Navigate to https://www.notion.so/profile/integrations, create a new integration, associate it with your development workspace, and select Read content capabilities.",
        "notion_create",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://developers.notion.com/docs/create-a-notion-integration",
      completion:
        "Integration created and internal token or OAuth client credentials issued.",
      dependsOn: [],
    },
    {
      id: "configure-oauth",
      title: "Configure public OAuth 2.0 distribution settings",
      detail: c(
        "Under integration distribution settings, switch the integration from internal to public, set company name, website, and register your secure HTTPS redirect URI.",
        "notion_auth",
        "notion_create",
      ),
      owner: "developer",
      path: "both",
      sourceUrl: "https://developers.notion.com/docs/authorization",
      completion:
        "Public integration settings configured with OAuth client ID, client secret, and authorized redirect URI.",
      dependsOn: ["create-integration"],
    },
    {
      id: "authorize-workspace",
      title: "Prompt user authorization for workspace access",
      detail: c(
        "Direct the user to https://api.notion.com/v1/oauth/authorize with client_id, response_type=code, owner=user, and redirect_uri. The user authorizes access to their selected workspace.",
        "notion_auth",
      ),
      owner: "user",
      path: "test",
      sourceUrl: "https://developers.notion.com/docs/authorization",
      completion:
        "User grants access on the Notion authorization screen and the callback receives an authorization code.",
      dependsOn: ["configure-oauth"],
    },
    {
      id: "exchange-access-token",
      title: "Exchange authorization code for workspace access token",
      detail: c(
        "Send POST https://api.notion.com/v1/oauth/token with HTTP Basic Authentication (base64 client_id:client_secret) and JSON payload containing grant_type 'authorization_code', code, and redirect_uri.",
        "notion_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.notion.com/docs/authorization",
      completion:
        "Permanent access token, workspace ID, and bot ID stored securely in backend secrets vault.",
      dependsOn: ["authorize-workspace"],
    },
    {
      id: "share-pages-with-connection",
      title: "Explicitly share test pages with integration connection",
      detail: c(
        "In Notion, open the target test pages or knowledge base database, open the page settings menu (...), select 'Add connections', and choose your integration. Notion API cannot view unshared pages.",
        "notion_start",
        "notion_manage",
      ),
      owner: "user",
      path: "test",
      sourceUrl: "https://developers.notion.com/docs/getting-started",
      completion:
        "Integration connection added to test pages, granting API visibility.",
      dependsOn: ["exchange-access-token"],
    },
    {
      id: "test-search-api",
      title: "Execute search query on shared pages",
      detail: c(
        "Call POST https://api.notion.com/v1/search with Notion-Version header (e.g. 2022-06-28) and Authorization Bearer token to search page titles and ensure shared test pages are returned.",
        "notion_search",
        "notion_start",
      ),
      owner: "developer",
      path: "test",
      sourceUrl: "https://developers.notion.com/reference/post-search",
      completion:
        "Search endpoint returns shared page metadata matching the knowledge assistant test query.",
      dependsOn: ["share-pages-with-connection"],
    },
    {
      id: "confirm-admin-policy",
      title: "Confirm workspace integration policy",
      detail: c(
        "Verify with workspace administrators whether team settings allow members to install public integrations and add connections to organizational workspaces.",
        "notion_manage",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://www.notion.so/help/add-and-manage-integrations-with-the-api",
      completion:
        "Workspace integration governance documented and approved by workspace admin.",
      dependsOn: ["configure-oauth"],
    },
  ],
  approvals: [
    {
      title: "Workspace member OAuth authorization",
      kind: "consent",
      owner: "user",
      detail: c(
        "The installing user must authorize the integration to access their chosen Notion workspace via the OAuth consent dialog.",
        "notion_auth",
      ),
    },
    {
      title: "Page connection sharing approval",
      kind: "consent",
      owner: "user",
      detail: c(
        "A workspace member with page edit permissions must explicitly connect the integration to target pages or parent knowledge trees.",
        "notion_start",
        "notion_manage",
      ),
    },
    {
      title: "Workspace administrator integration review",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Workspace administrators may restrict integration installations across organization workspaces or require approval before connections can be added.",
        "notion_manage",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Integration registration, OAuth exchange, and search test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Developer has an existing Notion workspace and test pages; excludes building knowledge embedding pipelines.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Workspace access and test document preparation",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Creating test pages with synthetic documentation for search indexing.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Workspace administrator integration review",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only if workspace settings enforce administrative approval for custom integrations.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 404 Object Not Found / Empty Search Results",
      recovery: c(
        "Notion returns 404 or empty search results if the page is not explicitly shared with the integration. Open the target page in Notion, click '...', and add the integration under 'Connections'.",
        "notion_start",
        "notion_search",
      ),
      owner: "user",
    },
    {
      title: "Missing or Invalid Notion-Version Header",
      recovery: c(
        "All Notion API requests require the 'Notion-Version' header (e.g., '2022-06-28'). Requests omitting this header or using an unsupported date string will fail with HTTP 400.",
        "notion_start",
      ),
      owner: "developer",
    },
    {
      title: "Workspace Administrator Disallowed Integration",
      recovery: c(
        "If workspace settings block members from installing public integrations, request the workspace owner enable integration access in Settings & Members > Connections.",
        "notion_manage",
        "unknown",
      ),
      owner: "administrator",
    },
  ],
  nextAction:
    "Open https://www.notion.so/profile/integrations, create an integration with Read content capability, and configure redirect URIs.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "notion_auth_doc",
      "Notion · Authorization",
      "https://developers.notion.com/docs/authorization",
    ),
    source(
      "notion_create_doc",
      "Notion · Create an integration",
      "https://developers.notion.com/docs/create-a-notion-integration",
    ),
    source(
      "notion_start_doc",
      "Notion · Getting started with the Notion API",
      "https://developers.notion.com/docs/getting-started",
    ),
    source(
      "notion_search_doc",
      "Notion · Search by title (API reference)",
      "https://developers.notion.com/reference/post-search",
    ),
    source(
      "notion_manage_doc",
      "Notion · Add and manage integrations with the API",
      "https://www.notion.so/help/add-and-manage-integrations-with-the-api",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific coverage for Notion public OAuth versus internal tokens must be verified.",
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
        "Experienced developer; working Notion account and test workspace already available.",
      testId: null,
    },
    {
      id: "notion_auth",
      kind: "official_docs",
      sourceIds: ["notion_auth_doc"],
      note: "Notion supports OAuth 2.0 Authorization Code Grant for public integrations, exchanging code via POST https://api.notion.com/v1/oauth/token with HTTP Basic Authentication (client_id:client_secret). Internal integrations use workspace-scoped bearer tokens.",
      conditions:
        "Public integrations require redirect URI matching and HTTPS endpoints.",
      testId: null,
    },
    {
      id: "notion_create",
      kind: "official_docs",
      sourceIds: ["notion_create_doc"],
      note: "Integrations are registered at notion.so/profile/integrations. Developers configure integration type (Internal vs Public), associated workspace, and granular capabilities such as Read content, Read comments, and Read user information.",
      conditions:
        "Public integrations require company information, website, privacy policy, and redirect URIs.",
      testId: null,
    },
    {
      id: "notion_start",
      kind: "official_docs",
      sourceIds: ["notion_start_doc"],
      note: "Notion API requires the Notion-Version header (e.g. 2022-06-28) and Authorization Bearer token header on all requests. Integrations can only access pages and databases that workspace members explicitly share with the integration.",
      conditions:
        "Pages not explicitly shared return HTTP 404 Object Not Found.",
      testId: null,
    },
    {
      id: "notion_search",
      kind: "official_docs",
      sourceIds: ["notion_search_doc"],
      note: "POST https://api.notion.com/v1/search searches page titles and database titles shared with the integration. Filter parameters allow restricting searches to pages or databases.",
      conditions:
        "Only searches pages and databases that have been explicitly connected/shared with the integration.",
      testId: null,
    },
    {
      id: "notion_manage",
      kind: "official_docs",
      sourceIds: ["notion_manage_doc"],
      note: "Workspace owners manage integration installations and can restrict members from installing public integrations or adding connections to pages via Workspace settings > Connections.",
      conditions:
        "Enterprise and Team plans may enforce admin approval before integrations can be connected.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Notion API authorization guides, integration setup, capabilities, search endpoints, and page sharing requirements.",
      observation:
        "Documentation establishes OAuth 2.0 authorization code flow, basic auth token endpoint, read content/comments capabilities, and explicit page connection sharing rules. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Notion and create an integration in the developer portal.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Notion developer integrations portal at https://www.notion.so/profile/integrations without an active session.",
      observation:
        "Access requires interactive Notion user login before integrations can be registered or managed.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Notion account and navigate to My Integrations.",
    },
  ],
  unresolvedQuestions: [
    "Does your target workspace require Workspace Owner approval to install public integrations?",
    "Will users connect individual pages or full top-level team spaces to the knowledge assistant?",
    "Does Composio's managed Notion toolkit support the OAuth 2.0 public flow or internal tokens?",
  ],
  researchedAt: at,
};
