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

export const discordGuide: Guide = {
  id: "discord",
  schemaVersion: 1,
  researchMethod: "curated",
  provider: {
    name: "Discord",
    domain: "discord.com",
    identityStatus: "resolved",
  },
  scenario: {
    actions: "Post automated announcements to a guild channel via a bot",
    audience: "organization",
    stage: "test",
    ownership: "own",
  },
  title: "Post automated announcements to a guild channel with a Discord bot",
  summary:
    "Discord divides integration into OAuth2 (for user identification and guild selection) and Bot tokens (for server-level automated messaging). To post announcements into a guild channel, register an application, add a Bot user, generate an OAuth2 installation URL with bot and applications.commands scopes plus Send Messages permissions (2048), and dispatch messages via the REST API.",
  assumptions: [
    "The announcement agent posts structured announcements or operational updates to a designated guild text channel without reading historical messages or listening to voice channels.",
    "Initial testing occurs in a dedicated private development Discord guild (server) controlled by the developer or team administrator.",
    "Discord requires a Bot user token (with 'Authorization: Bot <token>' header) to post messages into channels, while OAuth2 handles user authorization and guild installation links.",
    "Adding a bot to a server requires the 'Manage Server' or 'Administrator' permission on that Discord guild.",
  ],
  researchStatus: "partial",
  oauthSupport: {
    type: "oauth2",
    finding: c(
      "Discord provides OAuth2 for authorizing user scopes (identify, guilds) and generating guild bot invite URLs with 'bot' and 'applications.commands' scopes. Automated channel messaging is authenticated using a persistent server-side Bot token rather than ephemeral user bearer tokens.",
      "discord_oauth",
      "discord_start",
    ),
  },
  managedAuth: {
    status: "unverified",
    finding: c(
      "Composio provides managed auth toolkits, but coverage for Discord bot token creation versus user OAuth2 bearer delegation for automated guild announcements was not verified.",
      "managed",
      "unknown",
    ),
  },
  recommendedPath: c(
    "For guild announcements, create a Discord Application with an associated Bot user. Generate an OAuth2 installation URL requesting 'bot' and 'applications.commands' scopes with 'Send Messages' permissions (integer 2048). Use the permanent Bot token in server backend calls to POST https://discord.com/api/v10/channels/{channel_id}/messages.",
    "discord_start",
    "discord_oauth",
    "discord_channel",
    "discord_permissions",
  ),
  testing: {
    status: "action_needed",
    summary: c(
      "Create a Discord application in the Developer Portal, add a Bot user, invite it to a test guild with Send Messages permission, and post a sample announcement. No live connection was executed in this guide.",
      "discord_start",
      "discord_permissions",
      "unknown",
    ),
    nextAction:
      "Navigate to discord.com/developers/applications, create an application, and configure a Bot user.",
  },
  launch: {
    status: "conditional",
    summary: c(
      "Guild deployment requires guild administrator approval to invite the bot, proper role hierarchy and channel permission overrides, and adherence to Discord's per-route rate limits (typically 5 messages per 5 seconds per channel).",
      "discord_permissions",
      "discord_ratelimits",
      "unknown",
    ),
    nextAction:
      "Confirm channel permissions with guild administrators and implement bucket-based rate limit backoff in the announcement worker.",
  },
  prerequisites: [
    {
      title: "Discord account and Developer Portal access",
      owner: "developer",
      detail: c(
        "An active Discord account with two-factor authentication enabled, which is required to view and copy bot tokens in the Discord Developer Portal.",
        "discord_start",
      ),
    },
    {
      title: "Dedicated test Discord guild (server)",
      owner: "administrator",
      detail: c(
        "A private development server where the developer has 'Manage Server' permissions to invite and test the bot without disturbing production communities.",
        "discord_permissions",
        "unknown",
      ),
    },
    {
      title: "Secure backend secrets storage",
      owner: "developer",
      detail: c(
        "A secure server-side environment to store the sensitive Discord Bot token and client secret, keeping them out of client bundles and source repositories.",
        "discord_start",
        "unknown",
      ),
    },
  ],
  permissions: [
    {
      name: "scope: bot",
      rationale: c(
        "Authorizes adding the bot user to the guild, enabling the backend service to post messages into channels via bot token authentication.",
        "discord_oauth",
        "discord_start",
      ),
      condition:
        "Essential scope for channel announcements; included in OAuth invite URL.",
    },
    {
      name: "scope: applications.commands",
      rationale: c(
        "Allows registering slash commands (/announce) directly within the guild, enabling team members to manage or trigger announcements interactively.",
        "discord_oauth",
        "discord_start",
      ),
      condition:
        "Recommended scope for modern Discord bot functionality and interaction management.",
    },
    {
      name: "scope: identify",
      rationale: c(
        "Permits fetching the authorizing user's Discord username, avatar, and discriminator for administrative audit trails.",
        "discord_oauth",
      ),
      condition:
        "User OAuth scope; requested if building a web dashboard to pair guild admins with bot configuration.",
    },
    {
      name: "scope: guilds",
      rationale: c(
        "Allows the dashboard to list servers the authorizing user manages, confirming they have permission to install the bot.",
        "discord_oauth",
      ),
      condition:
        "User OAuth scope; requested during web onboarding.",
    },
    {
      name: "permission: Send Messages (2048 / 0x800)",
      rationale: c(
        "The bitwise channel permission enabling the bot to post text messages and embeds into guild announcement channels.",
        "discord_permissions",
        "discord_channel",
      ),
      condition:
        "Configured in the OAuth URL permissions parameter (permissions=2048) or assigned via guild roles.",
    },
    {
      name: "permission: Read Message History (excluded)",
      rationale: c(
        "Allows reading prior channel message history. Excluded because announcement dispatch is unidirectional and does not require reading user conversations.",
        "discord_permissions",
      ),
      condition:
        "Explicitly excluded to uphold user privacy and least privilege.",
    },
  ],
  steps: [
    {
      id: "create-application",
      title: "Create application in Discord Developer Portal",
      detail: c(
        "Navigate to https://discord.com/developers/applications, create a new application, and set an application name and icon.",
        "discord_start",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://discord.com/developers/docs/getting-started",
      completion:
        "Application created and client ID recorded.",
      dependsOn: [],
    },
    {
      id: "configure-bot-user",
      title: "Create Bot user and obtain bot token",
      detail: c(
        "In the application settings, select the 'Bot' tab, add a Bot user, reset the bot token, and copy it into secure backend configuration. Enable relevant privileged intents only if needed.",
        "discord_start",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://discord.com/developers/docs/getting-started",
      completion:
        "Bot user configured and bot token saved securely in server environment.",
      dependsOn: ["create-application"],
    },
    {
      id: "generate-invite-url",
      title: "Generate OAuth2 bot invite URL",
      detail: c(
        "Under OAuth2 > URL Generator, select 'bot' and 'applications.commands' scopes, check 'Send Messages' permission (value 2048), and copy the generated authorization URL.",
        "discord_oauth",
        "discord_permissions",
      ),
      owner: "developer",
      path: "both",
      sourceUrl:
        "https://discord.com/developers/docs/topics/oauth2",
      completion:
        "OAuth2 invite URL generated with bot scope and permissions=2048.",
      dependsOn: ["configure-bot-user"],
    },
    {
      id: "invite-bot-to-guild",
      title: "Authorize and install bot into test guild",
      detail: c(
        "Open the invite URL in a browser, select the test server from the dropdown, and complete authorization. Requires 'Manage Server' permissions on the target guild.",
        "discord_permissions",
        "discord_oauth",
      ),
      owner: "administrator",
      path: "test",
      sourceUrl:
        "https://discord.com/developers/docs/topics/permissions",
      completion:
        "Bot user joins the test guild and appears in the member list.",
      dependsOn: ["generate-invite-url"],
    },
    {
      id: "post-test-announcement",
      title: "Post test announcement message to guild channel",
      detail: c(
        "Send a POST request to https://discord.com/api/v10/channels/{channel_id}/messages with header 'Authorization: Bot <token>' and JSON payload containing announcement content.",
        "discord_channel",
        "discord_start",
      ),
      owner: "developer",
      path: "test",
      sourceUrl:
        "https://discord.com/developers/docs/resources/channel",
      completion:
        "Announcement message appears in the designated guild channel and response HTTP 200 is received.",
      dependsOn: ["invite-bot-to-guild"],
    },
    {
      id: "implement-rate-limiting",
      title: "Implement per-route rate limiting and backoff",
      detail: c(
        "Discord enforces rate limits per route and channel (typically 5 messages per 5 seconds). Parse X-RateLimit headers and implement exponential backoff on HTTP 429 responses using retry_after.",
        "discord_ratelimits",
      ),
      owner: "developer",
      path: "launch",
      sourceUrl:
        "https://discord.com/developers/docs/topics/rate-limits",
      completion:
        "Rate limiter implemented with bucket tracking and retry_after backoff.",
      dependsOn: ["configure-bot-user"],
    },
    {
      id: "configure-channel-overrides",
      title: "Verify guild channel permissions and role overrides",
      detail: c(
        "Ensure the bot's server role or channel permission overrides explicitly grant Send Messages in target announcement channels while restricting posting in general discussion channels.",
        "discord_permissions",
        "unknown",
      ),
      owner: "administrator",
      path: "launch",
      sourceUrl:
        "https://discord.com/developers/docs/topics/permissions",
      completion:
        "Channel role overrides configured to isolate bot announcements to designated channels.",
      dependsOn: ["invite-bot-to-guild"],
    },
  ],
  approvals: [
    {
      title: "Guild administrator installation consent",
      kind: "administrator",
      owner: "administrator",
      detail: c(
        "A Discord guild member with 'Manage Server' or 'Administrator' permissions must approve the bot installation and grant channel permissions.",
        "discord_permissions",
      ),
    },
    {
      title: "User OAuth consent (for user scopes)",
      kind: "consent",
      owner: "user",
      detail: c(
        "If web onboarding uses 'identify' and 'guilds' scopes, the installing user must approve access to their Discord account details.",
        "discord_oauth",
      ),
    },
  ],
  activeEffort: [
    {
      label: "Application setup, bot configuration, and channel post test",
      value: "30–60 minutes",
      basis: "estimated",
      assumptions:
        "Developer has an existing Discord account with 2FA enabled and a test server; excludes building rich embed templates.",
      evidenceIds: ["effort"],
    },
  ],
  prerequisitesEffort: [
    {
      label: "Test guild creation and announcement channel setup",
      value: "10–20 minutes",
      basis: "estimated",
      assumptions:
        "Creating a fresh test guild and setting up an announcement channel.",
      evidenceIds: ["effort"],
    },
  ],
  externalWaiting: [
    {
      label: "Guild administrator integration review",
      value: "Unknown; organization-dependent",
      basis: "unknown",
      assumptions:
        "Applicable only if server administrators require internal security review before inviting custom bots.",
      evidenceIds: ["unknown"],
    },
  ],
  blockers: [
    {
      title: "HTTP 401 Unauthorized / Invalid Token",
      recovery: c(
        "Ensure the Authorization header is formatted as 'Bot <token>' with the exact bot token from the Developer Portal, not an OAuth bearer token.",
        "discord_start",
        "discord_oauth",
      ),
      owner: "developer",
    },
    {
      title: "HTTP 403 Forbidden / Missing Permissions",
      recovery: c(
        "Verify that the bot has been granted the 'Send Messages' permission (2048) in the target channel and that channel permission overrides do not deny bot roles.",
        "discord_permissions",
        "discord_channel",
      ),
      owner: "administrator",
    },
    {
      title: "HTTP 429 Too Many Requests / Rate Limited",
      recovery: c(
        "Discord enforces per-route rate limits (typically 5 messages per 5 seconds per channel). Inspect X-RateLimit-Reset-After and retry_after JSON properties and pause outgoing messages.",
        "discord_ratelimits",
      ),
      owner: "developer",
    },
  ],
  nextAction:
    "Navigate to https://discord.com/developers/applications, create an application, and configure a Bot user with Send Messages permission.",
  sources: [
    source(
      "composio",
      "Composio · Managed OAuth apps",
      "https://docs.composio.dev/toolkits/managed-auth",
    ),
    source(
      "discord_oauth_doc",
      "Discord · OAuth2 Overview",
      "https://discord.com/developers/docs/topics/oauth2",
    ),
    source(
      "discord_start_doc",
      "Discord · Getting Started & Applications",
      "https://discord.com/developers/docs/getting-started",
    ),
    source(
      "discord_channel_doc",
      "Discord · Channel Resource & Create Message",
      "https://discord.com/developers/docs/resources/channel",
    ),
    source(
      "discord_permissions_doc",
      "Discord · Permissions Reference",
      "https://discord.com/developers/docs/topics/permissions",
    ),
    source(
      "discord_ratelimits_doc",
      "Discord · Rate Limits",
      "https://discord.com/developers/docs/topics/rate-limits",
    ),
  ],
  evidence: [
    {
      id: "managed",
      kind: "official_docs",
      sourceIds: ["composio"],
      note: "Composio provides managed credentials and redirects for supported OAuth platforms. Toolkit-specific coverage for Discord bot token creation versus user OAuth2 bearer delegation must be verified.",
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
        "Experienced developer; working Discord account and test guild already available.",
      testId: null,
    },
    {
      id: "discord_oauth",
      kind: "official_docs",
      sourceIds: ["discord_oauth_doc"],
      note: "Discord OAuth2 supports user authorization (identify, guilds) and bot installation URLs with bot and applications.commands scopes, returning authorization codes for user token exchange.",
      conditions:
        "User tokens use Bearer authentication, whereas bot messages require Bot token authentication.",
      testId: null,
    },
    {
      id: "discord_start",
      kind: "official_docs",
      sourceIds: ["discord_start_doc"],
      note: "Applications are managed at discord.com/developers/applications. A Bot user is attached to the application, producing a persistent Bot token used in the Authorization: Bot <token> header.",
      conditions:
        "Bot tokens must be guarded securely; 2FA is required to view or regenerate tokens.",
      testId: null,
    },
    {
      id: "discord_channel",
      kind: "official_docs",
      sourceIds: ["discord_channel_doc"],
      note: "POST /channels/{channel.id}/messages creates a message in the specified channel. Requires Send Messages permission in that channel.",
      conditions:
        "Payloads accept content, embeds, and component rows up to size limits.",
      testId: null,
    },
    {
      id: "discord_permissions",
      kind: "official_docs",
      sourceIds: ["discord_permissions_doc"],
      note: "Discord permissions are represented as bitwise integers. Send Messages corresponds to 0x800 (integer 2048). Adding bots to guilds requires Manage Server permission.",
      conditions:
        "Permissions can be overridden at the channel level for specific roles or members.",
      testId: null,
    },
    {
      id: "discord_ratelimits",
      kind: "official_docs",
      sourceIds: ["discord_ratelimits_doc"],
      note: "Discord enforces per-route rate limits tracked via X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset-After response headers. Breaching limits returns HTTP 429 with retry_after.",
      conditions:
        "Applications must back off according to retry_after and track route bucket exhaustion.",
      testId: null,
    },
  ],
  attempts: [
    {
      id: "review",
      kind: "documentation_review",
      at,
      action:
        "Inspect official Discord Developer documentation covering OAuth2, bot creation, channel messaging endpoints, permission integers, and rate limits.",
      observation:
        "Documentation establishes OAuth2 URL generator, bot token mechanics, Send Messages permission bit (2048), channel create-message API, and per-route bucket rate limiting. No live connection was established.",
      outcome: "observed",
      stoppedAt: "Before authenticated setup or credential creation.",
      humanNext:
        "Log in to Discord Developer Portal and create a bot application.",
    },
    {
      id: "entry",
      kind: "entry_point_check",
      at,
      action:
        "Request the Discord Developer Applications portal at https://discord.com/developers/applications without credentials.",
      observation:
        "Access requires interactive Discord login before applications or bot tokens can be created or viewed.",
      outcome: "blocked",
      stoppedAt: "Interactive login boundary.",
      humanNext:
        "Sign in to your Discord account and open the Developer Portal.",
    },
  ],
  unresolvedQuestions: [
    "Does your server administration require custom bots to be reviewed or restricted to specific announcement channels?",
    "Will announcements use plain text messages, embeds, or interactive buttons?",
    "Does Composio's managed auth handle Bot token generation and persistent channel messaging or only user OAuth?",
  ],
  researchedAt: at,
};
