/**
 * Curated provider directory: name → official domain and public developer-documentation hosts.
 * Identity and entry points only. No policy, scope, or approval claim lives here — every guide
 * fact is retrieved live (or comes from a reviewed snapshot in lib/guides.ts).
 * `start` is set only where the entry page was confirmed to exist; otherwise research probes the docs host.
 */
export type DirectoryEntry = {
  name: string;
  aliases?: string[];
  domain: string;
  docs: string[];
  start?: string;
  category: string;
  /** Prepared guide id, when the library already has a reviewed snapshot. */
  guide?: string;
};

const G = "developers.google.com";
const MS = "learn.microsoft.com";
const ATL = "developer.atlassian.com";

export const providerDirectory: DirectoryEntry[] = [
  // Communication
  { name: "Slack", domain: "slack.com", docs: ["docs.slack.dev", "api.slack.com"], start: "https://docs.slack.dev/authentication/installing-with-oauth/", category: "Communication", guide: "slack" },
  { name: "Gmail", aliases: ["google mail"], domain: "google.com", docs: [G, "support.google.com"], start: "https://developers.google.com/workspace/gmail/api/auth/scopes", category: "Communication", guide: "gmail" },
  { name: "Discord", domain: "discord.com", docs: ["docs.discord.com", "discord.com"], start: "https://docs.discord.com/developers/topics/oauth2", category: "Communication", guide: "discord" },
  { name: "Microsoft Outlook", aliases: ["outlook", "office 365 mail", "microsoft 365 mail"], domain: "microsoft.com", docs: [MS], start: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app", category: "Communication", guide: "microsoft-outlook" },
  { name: "Microsoft Teams", aliases: ["teams"], domain: "microsoft.com", docs: [MS], start: "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow", category: "Communication" },
  { name: "Zoom", domain: "zoom.us", docs: ["developers.zoom.us"], start: "https://developers.zoom.us/docs/integrations/oauth/", category: "Communication", guide: "zoom" },
  { name: "Webex", domain: "webex.com", docs: ["developer.webex.com"], category: "Communication" },
  { name: "RingCentral", domain: "ringcentral.com", docs: ["developers.ringcentral.com"], start: "https://developers.ringcentral.com/guide/authentication/auth-code-flow", category: "Communication" },
  { name: "Aircall", domain: "aircall.io", docs: ["developer.aircall.io"], category: "Communication" },
  { name: "Front", domain: "front.com", docs: ["dev.frontapp.com"], start: "https://dev.frontapp.com/docs/oauth", category: "Communication" },
  { name: "Intercom", domain: "intercom.com", docs: ["developers.intercom.com"], start: "https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/setting-up-oauth", category: "Support" },
  { name: "Zendesk", domain: "zendesk.com", docs: ["developer.zendesk.com"], start: "https://developer.zendesk.com/documentation/marketplace/building-a-marketplace-app/set-up-a-global-oauth-client/", category: "Support" },
  { name: "Freshdesk", domain: "freshdesk.com", docs: ["developers.freshdesk.com"], category: "Support" },
  { name: "Help Scout", aliases: ["helpscout"], domain: "helpscout.com", docs: ["developer.helpscout.com"], start: "https://developer.helpscout.com/mailbox-api/overview/authentication/", category: "Support" },
  // Productivity
  { name: "Notion", domain: "notion.com", docs: ["developers.notion.com", "notion.so"], start: "https://developers.notion.com/llms.txt", category: "Productivity", guide: "notion" },
  { name: "Linear", domain: "linear.app", docs: ["linear.app"], start: "https://linear.app/developers/oauth-2-0-authentication", category: "Productivity", guide: "linear" },
  { name: "Asana", domain: "asana.com", docs: ["developers.asana.com"], start: "https://developers.asana.com/docs/oauth", category: "Productivity", guide: "asana" },
  { name: "Trello", domain: "trello.com", docs: [ATL], category: "Productivity", guide: "trello" },
  { name: "Jira", aliases: ["jira cloud", "atlassian jira"], domain: "atlassian.com", docs: [ATL], start: "https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/", category: "Productivity" },
  { name: "Confluence", domain: "atlassian.com", docs: [ATL], start: "https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/", category: "Productivity" },
  { name: "Todoist", domain: "todoist.com", docs: ["developer.todoist.com"], category: "Productivity", guide: "todoist" },
  { name: "ClickUp", domain: "clickup.com", docs: ["developer.clickup.com"], category: "Productivity", guide: "clickup" },
  { name: "monday.com", aliases: ["monday"], domain: "monday.com", docs: ["developer.monday.com"], start: "https://developer.monday.com/apps/docs/oauth", category: "Productivity" },
  { name: "Google Calendar", domain: "google.com", docs: [G], start: "https://developers.google.com/workspace/calendar/api/auth", category: "Productivity", guide: "google-calendar" },
  { name: "Calendly", domain: "calendly.com", docs: ["developer.calendly.com"], start: "https://developer.calendly.com/llms.txt", category: "Productivity" },
  { name: "Miro", domain: "miro.com", docs: ["developers.miro.com"], start: "https://developers.miro.com/docs/getting-started-with-oauth", category: "Productivity" },
  { name: "Smartsheet", domain: "smartsheet.com", docs: ["developers.smartsheet.com"], start: "https://developers.smartsheet.com/api/smartsheet/guides/advanced-topics/oauth", category: "Productivity" },
  { name: "Wrike", domain: "wrike.com", docs: ["developers.wrike.com"], category: "Productivity" },
  { name: "Lucid", aliases: ["lucidchart"], domain: "lucid.co", docs: ["developer.lucid.co"], category: "Productivity" },
  { name: "Harvest", domain: "getharvest.com", docs: ["help.getharvest.com"], start: "https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/", category: "Productivity" },
  { name: "SurveyMonkey", domain: "surveymonkey.com", docs: ["developer.surveymonkey.com"], category: "Productivity" },
  { name: "Typeform", domain: "typeform.com", docs: ["www.typeform.com"], start: "https://www.typeform.com/developers/get-started/applications/", category: "Productivity" },
  { name: "Tally", domain: "tally.so", docs: ["developers.tally.so", "tally.so"], category: "Productivity", guide: "tally" },
  // Data & files
  { name: "Google Drive", domain: "google.com", docs: [G], start: "https://developers.google.com/workspace/drive/api/guides/api-specific-auth", category: "Data & files", guide: "google-drive" },
  { name: "Google Sheets", domain: "google.com", docs: [G], start: "https://developers.google.com/workspace/guides/configure-oauth-consent", category: "Data & files" },
  { name: "Dropbox", domain: "dropbox.com", docs: ["developers.dropbox.com", "docs.dropboxapi.com"], start: "https://docs.dropboxapi.com/dropbox-api/docs/oauth", category: "Data & files", guide: "dropbox" },
  { name: "Box", domain: "box.com", docs: ["developer.box.com"], start: "https://developer.box.com/guides/authentication/oauth2/oauth2-setup", category: "Data & files" },
  { name: "OneDrive", aliases: ["microsoft onedrive"], domain: "microsoft.com", docs: [MS], start: "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow", category: "Data & files" },
  { name: "Airtable", domain: "airtable.com", docs: ["airtable.com", "support.airtable.com"], start: "https://airtable.com/developers/web/api/oauth-reference", category: "Data & files", guide: "airtable" },
  { name: "Dropbox Sign", aliases: ["hellosign"], domain: "hellosign.com", docs: ["developers.hellosign.com"], category: "Data & files" },
  { name: "DocuSign", domain: "docusign.com", docs: ["developers.docusign.com"], category: "Data & files" },
  // Development
  { name: "GitHub", domain: "github.com", docs: ["docs.github.com"], start: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app", category: "Development", guide: "github" },
  { name: "GitLab", domain: "gitlab.com", docs: ["docs.gitlab.com"], start: "https://docs.gitlab.com/api/oauth2/", category: "Development" },
  { name: "Bitbucket", domain: "bitbucket.org", docs: [ATL, "support.atlassian.com"], category: "Development" },
  { name: "Okta", domain: "okta.com", docs: ["developer.okta.com"], start: "https://developer.okta.com/docs/concepts/oauth-openid/", category: "Development" },
  { name: "Vercel", domain: "vercel.com", docs: ["vercel.com"], category: "Development" },
  { name: "Figma", domain: "figma.com", docs: ["developers.figma.com"], start: "https://developers.figma.com/docs/rest-api/oauth-apps/", category: "Design", guide: "figma" },
  { name: "Canva", domain: "canva.com", docs: ["www.canva.dev"], start: "https://www.canva.dev/docs/apps/rest-apis/authentication/", category: "Design" },
  { name: "Adobe", aliases: ["adobe creative cloud"], domain: "adobe.com", docs: ["developer.adobe.com"], start: "https://developer.adobe.com/developer-console/docs/guides/authentication/UserAuthentication/", category: "Design" },
  { name: "Autodesk", domain: "autodesk.com", docs: ["aps.autodesk.com"], category: "Design" },
  { name: "Webflow", domain: "webflow.com", docs: ["developers.webflow.com"], category: "Design" },
  { name: "Vimeo", domain: "vimeo.com", docs: ["developer.vimeo.com"], category: "Social & media" },
  // CRM & commerce
  { name: "HubSpot", domain: "hubspot.com", docs: ["developers.hubspot.com"], start: "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth", category: "CRM & commerce", guide: "hubspot" },
  { name: "Salesforce", domain: "salesforce.com", docs: ["developer.salesforce.com", "help.salesforce.com"], category: "CRM & commerce", guide: "salesforce" },
  { name: "Pipedrive", domain: "pipedrive.com", docs: ["pipedrive.readme.io"], start: "https://pipedrive.readme.io/docs/marketplace-oauth-authorization", category: "CRM & commerce" },
  { name: "Close", aliases: ["close crm"], domain: "close.com", docs: ["developer.close.com"], category: "CRM & commerce" },
  { name: "Copper", domain: "copper.com", docs: ["developer.copper.com"], category: "CRM & commerce" },
  { name: "Zoho CRM", aliases: ["zoho"], domain: "zoho.com", docs: ["www.zoho.com"], start: "https://www.zoho.com/crm/developer/docs/api/v8/oauth-overview.html", category: "CRM & commerce" },
  { name: "Shopify", domain: "shopify.com", docs: ["shopify.dev"], start: "https://shopify.dev/docs/api/usage/access-scopes", category: "CRM & commerce", guide: "shopify" },
  { name: "BigCommerce", domain: "bigcommerce.com", docs: ["developer.bigcommerce.com"], category: "CRM & commerce" },
  { name: "Wix", domain: "wix.com", docs: ["dev.wix.com"], start: "https://dev.wix.com/docs/api-reference/app-management/oauth-2/introduction", category: "CRM & commerce" },
  { name: "Squarespace", domain: "squarespace.com", docs: ["developers.squarespace.com"], start: "https://developers.squarespace.com/commerce-apis/oauth", category: "CRM & commerce" },
  { name: "Etsy", domain: "etsy.com", docs: ["developers.etsy.com"], start: "https://developers.etsy.com/documentation/essentials/authentication/", category: "CRM & commerce" },
  { name: "eBay", domain: "ebay.com", docs: ["developer.ebay.com"], category: "CRM & commerce" },
  { name: "Eventbrite", domain: "eventbrite.com", docs: ["www.eventbrite.com"], category: "CRM & commerce" },
  { name: "Mailchimp", domain: "mailchimp.com", docs: ["mailchimp.com"], category: "Marketing" },
  { name: "Klaviyo", domain: "klaviyo.com", docs: ["developers.klaviyo.com"], start: "https://developers.klaviyo.com/en/docs/set_up_oauth", category: "Marketing" },
  { name: "Constant Contact", domain: "constantcontact.com", docs: ["developer.constantcontact.com"], start: "https://developer.constantcontact.com/api_guide/server_flow.html", category: "Marketing" },
  { name: "Bitly", domain: "bitly.com", docs: ["dev.bitly.com"], category: "Marketing" },
  // Finance
  { name: "Stripe", aliases: ["stripe connect"], domain: "stripe.com", docs: ["docs.stripe.com"], start: "https://docs.stripe.com/connect/oauth-reference", category: "Finance" },
  { name: "PayPal", domain: "paypal.com", docs: ["developer.paypal.com"], category: "Finance" },
  { name: "Square", domain: "squareup.com", docs: ["developer.squareup.com"], category: "Finance" },
  { name: "QuickBooks", aliases: ["intuit", "quickbooks online"], domain: "intuit.com", docs: ["developer.intuit.com"], category: "Finance" },
  { name: "Xero", domain: "xero.com", docs: ["developer.xero.com"], category: "Finance" },
  { name: "FreshBooks", domain: "freshbooks.com", docs: ["www.freshbooks.com"], start: "https://www.freshbooks.com/api/authentication", category: "Finance" },
  { name: "Gusto", domain: "gusto.com", docs: ["docs.gusto.com"], category: "Finance" },
  { name: "Coinbase", domain: "coinbase.com", docs: ["docs.cdp.coinbase.com"], category: "Finance" },
  // Social & media
  { name: "YouTube", domain: "youtube.com", docs: [G], start: "https://developers.google.com/youtube/data/guides/authentication", category: "Social & media" },
  { name: "Spotify", domain: "spotify.com", docs: ["developer.spotify.com"], start: "https://developer.spotify.com/documentation/web-api/tutorials/code-flow", category: "Social & media" },
  { name: "X", aliases: ["twitter", "x (twitter)"], domain: "x.com", docs: ["docs.x.com", "developer.x.com"], category: "Social & media" },
  { name: "LinkedIn", domain: "linkedin.com", docs: [MS], start: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow", category: "Social & media" },
  { name: "Facebook", aliases: ["meta"], domain: "facebook.com", docs: ["developers.facebook.com"], category: "Social & media" },
  { name: "Instagram", domain: "instagram.com", docs: ["developers.facebook.com"], start: "https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login", category: "Social & media" },
  { name: "Pinterest", domain: "pinterest.com", docs: ["developers.pinterest.com"], start: "https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/", category: "Social & media" },
  { name: "TikTok", domain: "tiktok.com", docs: ["developers.tiktok.com"], category: "Social & media" },
  { name: "Twitch", domain: "twitch.tv", docs: ["dev.twitch.tv"], category: "Social & media" },
  // Health & fitness
  { name: "Strava", domain: "strava.com", docs: ["developers.strava.com"], start: "https://developers.strava.com/docs/authentication/", category: "Health & fitness" },
  { name: "Fitbit", domain: "fitbit.com", docs: ["dev.fitbit.com"], start: "https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/", category: "Health & fitness" },
  { name: "Oura", domain: "ouraring.com", docs: ["cloud.ouraring.com"], start: "https://cloud.ouraring.com/docs/authentication", category: "Health & fitness" },
  { name: "Withings", domain: "withings.com", docs: ["developer.withings.com"], category: "Health & fitness" },
  { name: "Patreon", domain: "patreon.com", docs: ["docs.patreon.com"], category: "Social & media" },
  { name: "Gorgias", domain: "gorgias.com", docs: ["developers.gorgias.com"], category: "Support" },
  { name: "Evernote", domain: "evernote.com", docs: ["dev.evernote.com"], start: "https://dev.evernote.com/legacy/doc/articles/authentication", category: "Productivity" },
  { name: "Sentry", domain: "sentry.io", docs: ["docs.sentry.io"], category: "Development" },
  { name: "PagerDuty", domain: "pagerduty.com", docs: ["developer.pagerduty.com"], category: "Development" },
  { name: "Datadog", domain: "datadoghq.com", docs: ["docs.datadoghq.com"], start: "https://docs.datadoghq.com/extend/integrations/api_integration.md", category: "Development" },
  { name: "Heroku", domain: "heroku.com", docs: ["devcenter.heroku.com"], start: "https://devcenter.heroku.com/articles/oauth", category: "Development" },
  { name: "DigitalOcean", domain: "digitalocean.com", docs: ["docs.digitalocean.com"], start: "https://docs.digitalocean.com/reference/api/oauth/", category: "Development" },
  { name: "Netlify", domain: "netlify.com", docs: ["docs.netlify.com"], start: "https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/", category: "Development" },
  // Industry
  { name: "Procore", domain: "procore.com", docs: ["developers.procore.com"], category: "Industry" },
];

const key = (s: string) => s.trim().toLowerCase().replace(/^the\s+/, "");

export function findDirectoryEntry(input: string, host?: string): DirectoryEntry | undefined {
  const k = key(input);
  const byName = providerDirectory.find((e) => key(e.name) === k || e.aliases?.some((a) => key(a) === k));
  if (byName) return byName;
  if (!host) return undefined;
  // Domains and docs hosts shared by several products (Google, Microsoft, Atlassian) cannot
  // identify one product from a URL alone.
  const count = (values: string[]) => values.reduce<Record<string, number>>((m, v) => ((m[v] = (m[v] || 0) + 1), m), {});
  const domainUse = count(providerDirectory.map((e) => e.domain));
  const docUse = count(providerDirectory.flatMap((e) => e.docs));
  const on = (h: string, d: string) => h === d || h.endsWith(`.${d}`);
  return (
    providerDirectory.find((e) => domainUse[e.domain] === 1 && on(host, e.domain)) ||
    providerDirectory.find((e) => e.docs.some((d) => docUse[d] === 1 && on(host, d)))
  );
}
