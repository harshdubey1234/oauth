import type { Guide } from "./schema";
import { assessGuide } from "./assessment";

const categories: Record<string, string> = {
  github: "Development",
  slack: "Communication",
  gmail: "Communication",
  tally: "Data & files",
  notion: "Productivity",
  linear: "Productivity",
  discord: "Communication",
  trello: "Productivity",
  asana: "Productivity",
  todoist: "Productivity",
  airtable: "Data & files",
  dropbox: "Data & files",
  "google-drive": "Data & files",
  "google-calendar": "Productivity",
  "microsoft-outlook": "Communication",
  clickup: "Productivity",
  figma: "Design",
  hubspot: "CRM & commerce",
  salesforce: "CRM & commerce",
  zoom: "Communication",
  shopify: "CRM & commerce",
};

/** Send only browsing fields to the library; full evidence stays on guide routes. */
export function summarizeGuide(g: Guide) {
  return {
    id: g.id,
    provider: g.provider,
    scenario: g.scenario,
    title: g.title,
    summary: g.summary,
    launch: { status: g.launch.status },
    blockers: g.blockers.map(({ title }) => ({ title })),
    permissions: g.permissions.map(({ name }) => ({ name })),
    unresolvedQuestions: g.unresolvedQuestions,
    researchedAt: g.researchedAt,
    category: categories[g.id] || "Other",
    authType: g.oauthSupport.type,
    assessment: assessGuide(g),
  };
}

export type LibraryGuide = ReturnType<typeof summarizeGuide>;
