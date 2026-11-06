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

export const shopifyGuide: Guide = {
  id: "shopify",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Shopify",
    domain: "shopify.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions:
      "Read orders and products for an AI inventory/sales assistant",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Read store orders and products for an AI inventory assistant",
  summary:
    "Shopify uses OAuth 2.0 authorization code flow with store-specific URLs (https://{shop}.myshopify.com/admin/oauth/authorize). Apps request granular access scopes (read_orders, read_products, read_customers) to query the Admin API. Public apps listed in the Shopify App Store require app review and mandatory GDPR webhooks.",
  assumptions: [
    "The AI inventory and sales assistant monitors order volume and inventory levels without modifying catalog items or fulfilling orders.",
    "Initial testing uses a Shopify Partner account and a development store containing sample products and orders.",
    "Shopify requires validating the shop domain and HMAC query parameters on every OAuth redirect.",
    "Public and custom apps must implement mandatory privacy compliance webhooks (customers/data_request, customers/redact, shop/redact).",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Shopify implements OAuth 2.0 authorization code grant flow with store-specific subdomains and offline permanent access tokens (or expiring online access tokens).",
      "shopify_auth",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed OAuth apps, but dynamic shop routing and GDPR webhook handling for Shopify was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "Create an app in the Shopify Partner Dashboard, spin up a development store, configure redirect URLs and scopes (read_orders, read_products, read_customers), implement HMAC verification and code exchange, and query Admin API resources.",
    "shopify_auth",
    "shopify_orders",
    "shopify_products",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Set up a free Shopify Partner account and create a development store to test OAuth authorization and API queries. No live connection has been made in this guide.",
      "shopify_auth",
      "unknown",
    ),
    nextAction:
      "Create a Shopify Partner account at partners.shopify.com and create a development store.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Custom app installation directly on a specific merchant store does not require App Store review; public multi-store distribution requires passing Shopify App Store review and implementing mandatory GDPR webhooks.",
      "shopify_review",
      "unknown",
    ),
    nextAction:
      "Determine whether the app will be installed as a custom app on specific stores or submitted for public Shopify App Store listing.",
  },
  prerequisites: [
    {
      title: "Shopify Partner Account",
      owner: "developer",
      detail: c(
        "A Partner account is required to register apps, obtain API credentials, and create unlimited development test stores.",
        "shopify_auth",
      ),
    },
    {
      title: "Development Store with Test Data",
      owner: "developer",
      detail: c(
        "A development store populated with synthetic products and orders provides a safe testing sandbox.",
        "shopify_products",
        "shopify_orders",
      ),
    },
    {
      title: "Secure Backend with HTTPS and HMAC Verification",
      owner: "developer",
      detail: c(
        "Shopify requires HTTPS for redirect URLs and requires validating HMAC SHA256 signatures on incoming OAuth requests.",
        "shopify_auth",
        "effort",
      ),
    },
  ],
  permissions: [
    {
      name: "read_orders",
      rationale: c(
        "Grants read access to merchant orders, line items, timestamps, and order financial statuses for sales analysis.",
        "shopify_orders",
      ),
      condition: "Requested during OAuth authorization; read-only.",
    },
    {
      name: "read_products",
      rationale: c(
        "Grants read access to product titles, variants, SKUs, inventory levels, and pricing for inventory forecasting.",
        "shopify_products",
      ),
      condition: "Requested during OAuth authorization; read-only.",
    },
    {
      name: "read_customers",
      rationale: c(
        "Grants read access to customer profiles and purchase history associated with orders.",
        "shopify_orders",
      ),
      condition: "Requested during OAuth authorization; read-only.",
    },
    {
      name: "write_orders (excluded)",
      rationale: c(
        "Allows creating, updating, and cancelling orders. Excluded to maintain least privilege.",
        "shopify_orders",
      ),
      condition: "Explicitly excluded.",
    },
    {
      name: "write_products (excluded)",
      rationale: c(
        "Allows modifying product descriptions, pricing, and deleting catalog items. Excluded to maintain least privilege.",
        "shopify_products",
      ),
      condition: "Explicitly excluded.",
    },
  ],
  steps: [
    {
      id: "create-partner-account",
      title: "Create Shopify Partner account and dev store",
      detail: c(
        "Sign up at partners.shopify.com and create a development store preloaded with test product and order data.",
        "shopify_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps",
      completion:
        "Partner account created and development store ready for app testing.",
      dependsOn: [],
    },
    {
      id: "create-app-in-partner-dashboard",
      title: "Register an app in Partner Dashboard",
      detail: c(
        "In Partner Dashboard > Apps, create an app to obtain the Client ID (API key) and Client Secret.",
        "shopify_auth",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps",
      completion:
        "App registered with credentials saved in secure backend storage.",
      dependsOn: ["create-partner-account"],
    },
    {
      id: "configure-app-urls-and-scopes",
      title: "Configure redirect URLs and granular read scopes",
      detail: c(
        "Set the App URL and allowed redirection URL(s). Configure requested scopes: read_orders, read_products, and read_customers.",
        "shopify_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps",
      completion:
        "Redirect URLs and granular scopes configured in Partner Dashboard.",
      dependsOn: ["create-app-in-partner-dashboard"],
    },
    {
      id: "initiate-oauth-handshake",
      title: "Initiate OAuth authorization redirect",
      detail: c(
        "Redirect the merchant to https://{shop}.myshopify.com/admin/oauth/authorize with client_id, scope, redirect_uri, and a cryptographic state nonce.",
        "shopify_auth",
      ),
      owner: "user",
      path: "test",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps",
      completion:
        "Merchant approves app installation in their store admin and is redirected with auth code and HMAC.",
      dependsOn: ["configure-app-urls-and-scopes"],
    },
    {
      id: "validate-hmac-and-exchange-token",
      title: "Validate HMAC signature and exchange code for access token",
      detail: c(
        "Validate the incoming request's HMAC signature using your Client Secret, then send a POST request to https://{shop}.myshopify.com/admin/oauth/access_token with client_id, client_secret, and code.",
        "shopify_auth",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps",
      completion:
        "Permanent offline access token received and securely associated with the shop domain.",
      dependsOn: ["initiate-oauth-handshake"],
    },
    {
      id: "fetch-orders-and-products",
      title: "Query store orders and products from Admin API",
      detail: c(
        "Call GET https://{shop}.myshopify.com/admin/api/2024-01/orders.json and GET https://{shop}.myshopify.com/admin/api/2024-01/products.json with X-Shopify-Access-Token header to fetch inventory and sales records.",
        "shopify_orders",
        "shopify_products",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://shopify.dev/docs/api/admin-rest/current/resources/order",
      completion:
        "Order and product data parsed and verified against development store records.",
      dependsOn: ["validate-hmac-and-exchange-token"],
    },
    {
      id: "implement-gdpr-webhooks",
      title: "Implement mandatory compliance webhooks",
      detail: c(
        "Implement endpoints for customers/data_request, customers/redact, and shop/redact to handle merchant and customer privacy requests.",
        "shopify_review",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance",
      completion:
        "Compliance webhooks implemented, HMAC verified, and responding with HTTP 200.",
      dependsOn: ["create-app-in-partner-dashboard"],
    },
    {
      id: "submit-app-store-listing",
      title: "Submit app for Shopify App Store review (if public)",
      detail: c(
        "Prepare listing details, pricing, test credentials, demo video, and submit for Shopify App Store review.",
        "shopify_review",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance",
      completion:
        "App approved and published in the Shopify App Store.",
      dependsOn: ["implement-gdpr-webhooks"],
    },
  ],
  approvals: [
    {
      title: "Merchant Store Installation Consent",
      kind: "consent",
      owner: "user",
      detail: c(
        "Merchant store owner reviews requested scopes and approves app installation on their Shopify store.",
        "shopify_auth",
      ),
    },
    {
      title: "Store Administrator Custom App Permission",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "For custom apps installed directly, store owners must enable custom app development in store settings.",
        "shopify_auth",
        "unknown",
      ),
    },
    {
      title: "Shopify App Store Review",
      kind: "distribution",
      owner: "provider",
      detail: c(
        "Public apps must undergo automated checks and human review by Shopify's app review team before being listed.",
        "shopify_review",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Partner app registration + OAuth handshake + Admin API read test",
      value: "45–90 minutes",
      basis: "estimated",
      assumptions:
        "Existing Shopify Partner account and dev store; excludes building forecasting logic.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Shopify Partner account and dev store setup",
      value: "15–30 minutes",
      basis: "estimated",
      assumptions:
        "Creating free partner account and populating dev store with sample orders and products.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Shopify App Store review turnaround",
      value: "Unknown; provider-dependent (typically 5–10 business days)",
      basis: "unknown",
      assumptions:
        "Applicable only for public App Store distribution, not custom store apps.",
      evidenceIds: ["shopify_review", "unknown"],
    },
  ],
  blockers: [
    {
      title: "HMAC Verification Failed (HTTP 401)",
      recovery: c(
        "Ensure all query parameters except 'hmac' are sorted lexicographically and hashed with SHA256 using the app's Client Secret.",
        "shopify_auth",
      ),
      owner: "developer",
    },
    {
      title: "Invalid Shop Parameter",
      recovery: c(
        "Validate that the shop query parameter matches the regex ^[a-zA-Z0-9][a-zA-Z0-9-]*\\.myshopify\\.com$ to prevent phishing attacks.",
        "shopify_auth",
      ),
      owner: "developer",
    },
    {
      title: "API Rate Limit Exceeded (HTTP 429)",
      recovery: c(
        "Shopify Admin REST API uses a leaky bucket algorithm (40 req/bucket, refill 2 req/sec). Inspect X-Shopify-Shop-Api-Call-Limit header and throttle requests.",
        "shopify_orders",
        "unknown",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Create a Shopify Partner account at partners.shopify.com and set up a development store.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "shopify_oauth_doc",
      "Shopify · Authenticate a standalone or API-only app (authorization code grant)",
      "https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps",
    ),
    source(
      "shopify_order_doc",
      "Shopify · Admin REST API: Order Resource",
      "https://shopify.dev/docs/api/admin-rest/current/resources/order",
    ),
    source(
      "shopify_product_doc",
      "Shopify · Admin REST API: Product Resource",
      "https://shopify.dev/docs/api/admin-rest/current/resources/product",
    ),
    source(
      "shopify_listing_doc",
      "Shopify · Privacy law compliance (mandatory compliance webhooks)",
      "https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed OAuth apps, but dynamic shop routing and GDPR webhook handling for Shopify was not verified.",
      conditions:
        "Scenario-specific; verify Shopify toolkit capabilities.",
      testId: null,
    },
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This scenario-specific fact, approval requirement, or review timeframe has not been verified against official documentation.",
      conditions:
        "Confirm against current Shopify documentation or merchant admin policies.",
      testId: null,
    },
    {
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate for setup and minimal read verification, not an observed execution duration.",
      conditions:
        "Experienced developer with working backend and Shopify Partner account.",
      testId: null,
    },
    {
      id: "shopify_auth",
      kind: "official_docs",
      sourceIds: ["shopify_oauth_doc"],
      note: "Shopify documents the OAuth authorization code flow with store-specific URLs (/admin/oauth/authorize and /admin/oauth/access_token), HMAC verification, and offline access tokens.",
      conditions:
        "Requires server-side HMAC validation and secure token storage.",
      testId: null,
    },
    {
      id: "shopify_orders",
      kind: "official_docs",
      sourceIds: ["shopify_order_doc"],
      note: "The Admin REST API Order resource provides endpoints to read store orders, requiring the read_orders or read_all_orders scope.",
      conditions: "Requires X-Shopify-Access-Token header.",
      testId: null,
    },
    {
      id: "shopify_products",
      kind: "official_docs",
      sourceIds: ["shopify_product_doc"],
      note: "The Admin REST API Product resource provides endpoints to read store products, variants, and inventory levels requiring the read_products scope.",
      conditions: "Requires X-Shopify-Access-Token header.",
      testId: null,
    },
    {
      id: "shopify_review",
      kind: "official_docs",
      sourceIds: ["shopify_listing_doc"],
      note: "Shopify requires public apps to meet app requirements, undergo review, and implement mandatory GDPR compliance webhooks.",
      conditions: "Applies to public apps listed in the Shopify App Store.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect Shopify OAuth authorization code grant documentation, Admin REST API order and product resources, and app listing review guides.",
      observation:
        "Shopify documents OAuth 2.0 flow with shop-specific endpoints, HMAC verification, Admin REST API resources for orders and products, and mandatory GDPR webhooks. No live connection was initiated.",
      outcome: "observed",
      stoppedAt: "Before authenticated account or app creation.",
      humanNext:
        "Create a Shopify Partner account and create a development store.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request Shopify Partner portal at https://partners.shopify.com/ without credentials.",
      observation:
        "The page redirected to Shopify interactive sign-in form. Authentication is required to access Partner Dashboard.",
      outcome: "blocked",
      stoppedAt: "Interactive login screen.",
      humanNext: "Log in to your Shopify Partner account.",
    },
  ],
  unresolvedQuestions: [
    "Will the assistant be deployed as a custom app installed directly on specific merchant stores or listed publicly in the Shopify App Store?",
    "Does the backend application implement dynamic multi-tenant shop subdomain routing and cryptographic HMAC verification?",
    "Does Composio's Shopify integration satisfy Shopify's mandatory GDPR compliance webhook requirements?",
  ],
  researchedAt: at,
};
