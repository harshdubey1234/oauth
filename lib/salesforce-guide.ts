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

export const salesforceGuide: Guide = {
  id: "salesforce",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Salesforce",
    domain: "salesforce.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read accounts and opportunities from a CRM for AI sales forecasting",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read CRM accounts and opportunities for AI sales forecasting",
  summary:
    "Salesforce uses the OAuth 2.0 Web Server Flow with Connected Apps configured in Salesforce Setup. Request standard API scopes (api, id, refresh_token, openid) and query account and opportunity sObjects via instance-specific REST API URLs.",
  assumptions: [
    "The AI forecasting tool reads account and opportunity records to model pipeline velocity and forecast revenue without editing records.",
    "Initial development and verification are performed in a free Salesforce Developer Edition org or isolated sandbox.",
    "A Connected App must be created in Salesforce Setup > App Manager with OAuth settings enabled.",
    "Salesforce REST API requests require using the instance-specific URL returned in the OAuth token response.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Salesforce implements the OAuth 2.0 Web Server Flow via Connected Apps, issuing an access token, instance URL, and optional refresh token for REST API calls.",
      "salesforce_flow",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed OAuth apps, but toolkit coverage for Salesforce instance-specific routing and SOQL queries for forecasting was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Create a Connected App in Salesforce Setup, configure callback URLs and scopes (api, id, refresh_token, openid), run the Web Server flow to exchange the authorization code for an access token and instance URL, and query Account and Opportunity sObjects via the REST API.",
    "salesforce_flow",
    "salesforce_create",
    "salesforce_rest",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create a free Salesforce Developer Edition org, configure a test Connected App, and run the Web Server flow to query test accounts and opportunities. No live connection has been made in this guide.",
      "salesforce_flow",
      "unknown",
    ),
    nextAction:
      "Sign up for a Salesforce Developer Edition org at developer.salesforce.com/signup and open Setup.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Internal organization rollout requires Salesforce admin Connected App policy configuration; commercial distribution via AppExchange requires passing a formal Salesforce Security Review.",
      "salesforce_manage",
      "unknown",
    ),
    nextAction:
      "Determine whether the application will be installed directly into customer orgs or distributed as a managed package on Salesforce AppExchange.",
  },
  prerequisites: [
    {
      title: "Salesforce Developer Edition Org or Sandbox",
      owner: "developer",
      detail: c(
        "A Developer Edition org or sandbox environment is needed to build and test Connected Apps without impacting production data.",
        "salesforce_create",
      ),
    },
    {
      title: "Salesforce System Administrator access",
      owner: "administrator",
      detail: c(
        "Creating and configuring Connected Apps and setting OAuth policies requires System Administrator privileges in Salesforce Setup.",
        "salesforce_create",
        "salesforce_manage",
      ),
    },
    {
      title: "Secure backend secrets store",
      owner: "developer",
      detail: c(
        "The Consumer Key, Consumer Secret, and issued refresh tokens must be kept in secure server-side storage and never exposed to clients.",
        "salesforce_flow",
        "effort",
      ),
    },
  ],
  permissions: [
    {
      name: "api",
      rationale: c(
        "Grants access to Salesforce REST API resources, allowing the integration to query Account and Opportunity sObjects.",
        "salesforce_rest",
      ),
      condition:
        "Requested during OAuth authorization; grants API access subject to the user's Salesforce profile permissions.",
    },
    {
      name: "id",
      rationale: c(
        "Grants access to the Identity URL service to verify user identity, organization ID, and user profile information.",
        "salesforce_flow",
      ),
      condition: "Requested during OAuth authorization.",
    },
    {
      name: "refresh_token",
      rationale: c(
        "Grants offline access to obtain a refresh token, allowing the backend to request new access tokens when the current one expires.",
        "salesforce_flow",
      ),
      condition:
        "Requested during OAuth authorization (offline_access equivalent in Salesforce).",
    },
    {
      name: "openid",
      rationale: c(
        "Grants access to OpenID Connect userinfo endpoint and JWT id_tokens to establish federated identity.",
        "salesforce_flow",
      ),
      condition: "Requested during OAuth authorization alongside id.",
    },
    {
      name: "full (excluded)",
      rationale: c(
        "Grants full access to all Salesforce data, APIs, and administrative capabilities. Excluded to maintain least privilege.",
        "salesforce_flow",
      ),
      condition: "Explicitly excluded.",
    },
  ],
  steps: [
    {
      id: "create-dev-org",
      title: "Sign up for a Salesforce Developer Edition org",
      detail: c(
        "Register for a free Salesforce Developer Edition environment to safely test Connected Apps and sample CRM data.",
        "salesforce_create",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm",
      completion:
        "Developer Edition org provisioned with administrative access.",
      dependsOn: [],
    },
    {
      id: "create-connected-app",
      title: "Create a Connected App in Salesforce Setup",
      detail: c(
        "In Setup > App Manager, click New Connected App. Enter basic app information, contact email, and check 'Enable OAuth Settings'.",
        "salesforce_create",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm",
      completion:
        "Connected App created and assigned a Consumer Key (client ID) and Consumer Secret.",
      dependsOn: ["create-dev-org"],
    },
    {
      id: "configure-oauth-settings",
      title: "Configure callback URL and OAuth scopes",
      detail: c(
        "Set the callback URL and select OAuth scopes: 'api', 'id', 'refresh_token', and 'openid'. Save the app and wait 2–10 minutes for initial propagation.",
        "salesforce_create",
        "salesforce_flow",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm",
      completion:
        "OAuth settings saved with Consumer Key and Secret recorded in backend secrets.",
      dependsOn: ["create-connected-app"],
    },
    {
      id: "authorize-web-server-flow",
      title: "Direct user to Salesforce authorization endpoint",
      detail: c(
        "Redirect the user to https://login.salesforce.com/services/oauth2/authorize with response_type=code, client_id, redirect_uri, and scope parameters.",
        "salesforce_flow",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
      completion:
        "User logs in, consents to permissions, and browser redirects to callback URL with auth code.",
      dependsOn: ["configure-oauth-settings"],
    },
    {
      id: "exchange-code-for-tokens",
      title: "Exchange authorization code for access and refresh tokens",
      detail: c(
        "Make a POST call to https://login.salesforce.com/services/oauth2/token with grant_type=authorization_code, client_id, client_secret, redirect_uri, and code.",
        "salesforce_flow",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
      completion:
        "Response returns access_token, refresh_token, and instance_url.",
      dependsOn: ["authorize-web-server-flow"],
    },
    {
      id: "query-crm-records",
      title: "Query Account and Opportunity records via REST API",
      detail: c(
        "Call GET {instance_url}/services/data/v60.0/query/?q=SELECT+Id,Name,Amount,StageName,CloseDate+FROM+Opportunity using the Bearer token.",
        "salesforce_rest",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm",
      completion:
        "Sales records retrieved and formatted for the forecasting model.",
      dependsOn: ["exchange-code-for-tokens"],
    },
    {
      id: "configure-connected-app-policies",
      title: "Configure Connected App OAuth access policies",
      detail: c(
        "In Setup > Connected Apps OAuth Usage, set Permitted Users policy ('All users may self-authorize' vs 'Admin approved users are pre-authorized') and session timeout settings.",
        "salesforce_manage",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.connected_app_manage.htm",
      completion:
        "Access policies aligned with organization governance rules.",
      dependsOn: ["create-connected-app"],
    },
    {
      id: "refresh-token-handling",
      title: "Implement automated token refresh routine",
      detail: c(
        "Implement refresh flow calling POST https://login.salesforce.com/services/oauth2/token with grant_type=refresh_token when the access token expires.",
        "salesforce_flow",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
      completion:
        "Token refresh cycle operates automatically without requiring user re-authentication.",
      dependsOn: ["exchange-code-for-tokens"],
    },
    {
      id: "appexchange-security-review",
      title: "Pass Salesforce AppExchange Security Review (if public)",
      detail: c(
        "For public AppExchange listings, submit the package and connected app for formal security review, running vulnerability scans and paying review fees.",
        "salesforce_manage",
        "unknown",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://help.salesforce.com/s/articleView?id=sf.connected_app_manage.htm",
      completion:
        "Security review passed and package approved for AppExchange listing.",
      dependsOn: ["configure-connected-app-policies"],
    },
  ],
  approvals: [
    {
      title: "User Authorization Consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Authorizing Salesforce user approves app access to their organization's data via the OAuth consent prompt.",
        "salesforce_flow",
      ),
    },
    {
      title: "Salesforce Administrator Policy Approval",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "Salesforce administrators control Connected App policies, IP restrictions, and permitted user profiles.",
        "salesforce_manage",
      ),
    },
    {
      title: "Salesforce AppExchange Security Review",
      kind: "verification",
      owner: "provider",
      detail: c(
        "Public commercial distribution requires passing Salesforce's rigorous AppExchange security review.",
        "salesforce_manage",
        "unknown",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Connected App registration + OAuth flow + SOQL query test",
      value: "60–120 minutes",
      basis: "estimated",
      assumptions:
        "Existing Salesforce Developer org, basic SOQL knowledge; excludes building forecasting AI algorithms.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Developer Edition org creation and Connected App propagation",
      value: "20–40 minutes",
      basis: "estimated",
      assumptions:
        "Sign up for developer org and account for 2–10 minute propagation delay for new Connected Apps.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Salesforce AppExchange Security Review turnaround",
      value: "Unknown; provider-dependent (weeks to months)",
      basis: "unknown",
      assumptions:
        "Applicable only for public commercial AppExchange distribution; not required for internal connected apps.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "Connected App Propagation Delay (HTTP 400 invalid_client_id)",
      recovery: c(
        "Newly created Connected Apps take 2 to 10 minutes to propagate across Salesforce authorization servers. Wait 10 minutes before retrying the flow.",
        "salesforce_create",
      ),
      owner: "developer",
    },
    {
      title: "Expired Access Token (HTTP 401 Session expired or invalid)",
      recovery: c(
        "Use the stored refresh_token to request a new access_token from the token endpoint without user intervention.",
        "salesforce_flow",
      ),
      owner: "developer",
    },
    {
      title: "Instance URL Routing Error (HTTP 404 or redirect loop)",
      recovery: c(
        "Always route REST API calls to the instance_url returned in the token response rather than hardcoded login.salesforce.com.",
        "salesforce_rest",
        "salesforce_flow",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Sign up for a Salesforce Developer Edition org at developer.salesforce.com/signup.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "salesforce_flow_doc",
      "Salesforce · OAuth 2.0 Web Server Flow",
      "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
    ),
    source(
      "salesforce_create_doc",
      "Salesforce · Create a Connected App",
      "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm",
    ),
    source(
      "salesforce_rest_doc",
      "Salesforce · Introducing the REST API",
      "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm",
    ),
    source(
      "salesforce_manage_doc",
      "Salesforce · Manage OAuth Access Policies for a Connected App",
      "https://help.salesforce.com/s/articleView?id=sf.connected_app_manage.htm",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed OAuth apps, but toolkit coverage for Salesforce instance-specific routing and SOQL queries for forecasting was not verified.",
      conditions:
        "Scenario-specific; verify Salesforce toolkit capabilities.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact, approval requirement, or review timeframe has not been verified against official documentation.",
      conditions:
        "Confirm against current Salesforce documentation or administrative policies.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for setup and minimal read verification, not an observed execution duration.",
      conditions:
        "Experienced developer with working backend and Salesforce developer account.",
      testId: null,
    },
    {
      id: "salesforce_flow",
      kind: "official_docs",
      sourceIds: ["salesforce_flow_doc"],
      note: "Salesforce documents the OAuth 2.0 Web Server flow using /services/oauth2/authorize and /services/oauth2/token, returning access_token, instance_url, and refresh_token.",
      conditions:
        "Requires server-side code exchange and secure storage of client secret and refresh tokens.",
      testId: null,
    },
    {
      id: "salesforce_create",
      kind: "official_docs",
      sourceIds: ["salesforce_create_doc"],
      note: "Connected Apps are created in Salesforce Setup > App Manager. Enabling OAuth generates the Consumer Key and Secret, and configuration changes take 2–10 minutes to propagate.",
      conditions: "Requires Salesforce System Administrator privileges.",
      testId: null,
    },
    {
      id: "salesforce_rest",
      kind: "official_docs",
      sourceIds: ["salesforce_rest_doc"],
      note: "The Salesforce REST API provides access to sObjects (Accounts, Opportunities) using SOQL queries at instance-specific URLs.",
      conditions:
        "Requires Bearer token authorization and valid instance URL.",
      testId: null,
    },
    {
      id: "salesforce_manage",
      kind: "official_docs",
      sourceIds: ["salesforce_manage_doc"],
      note: "Connected App OAuth policies govern permitted user profiles, IP relaxation, and session policies across organizational instances.",
      conditions: "Admin-managed in target org.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect Salesforce OAuth 2.0 Web Server Flow documentation, Connected App creation guide, REST API intro, and App Manager administration.",
      observation:
        "Salesforce documents the Web Server OAuth 2.0 flow, instance-specific REST API URLs, Connected App setup, and admin policies. No live connection was initiated.",
      outcome: "observed",
      stoppedAt: "Before authenticated account or Connected App setup.",
      humanNext:
        "Sign up for a Salesforce Developer Edition org and create a Connected App in Setup.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request Salesforce login portal at https://login.salesforce.com/ without credentials.",
      observation:
        "The page redirected to Salesforce interactive login form. Authentication is required to access Setup.",
      outcome: "blocked",
      stoppedAt: "Interactive login screen.",
      humanNext:
        "Log in to your Salesforce account or create a Developer Edition org.",
    },
  ],
  unresolvedQuestions: [
    "Will the integration use a customer-managed Connected App or a multi-tenant AppExchange package?",
    "Does the customer Salesforce organization enforce IP restrictions or require pre-authorized profiles for Connected Apps?",
    "Does Composio's Salesforce integration automatically handle instance_url routing and SOQL queries for forecasting?",
  ],
  researchedAt: at,
};
