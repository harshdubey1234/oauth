import type { Guide } from "./schema";

/**
 * At-a-glance reading of a guide: difficulty for its scenario, hands-on time, waiting, and the
 * split between what the agent did / can do and what a human must do. Derived only from the
 * guide's own labelled data — it adds no new claims.
 */
export type Difficulty = "easy" | "moderate" | "hard" | "unclear";
export type Assessment = {
  level: Difficulty;
  label: string;
  why: string[];
  handsOn: string;
  handsOnBasis: string;
  waiting: string;
  waitingBasis: string;
};

type Input = Pick<
  Guide,
  "oauthSupport" | "launch" | "approvals" | "activeEffort" | "externalWaiting" | "researchStatus" | "scenario"
>;

export function assessGuide(g: Input): Assessment {
  const effort = g.activeEffort[0];
  const wait = g.externalWaiting[0];
  const base = {
    handsOn: effort?.value || "Not estimated",
    handsOnBasis: effort?.basis.replaceAll("_", " ") || "unknown",
    waiting: wait?.value || "Not established",
    waitingBasis: wait?.basis.replaceAll("_", " ") || "unknown",
  };
  const t = g.oauthSupport.type;
  if (g.researchStatus === "needs_clarification" || t === "unknown")
    return { ...base, level: "unclear", label: "Unclear", why: ["The OAuth path was not established from the sources read."] };
  if (t === "api_key")
    return { ...base, level: "unclear", label: "No OAuth path", why: ["The docs describe API keys rather than OAuth for this API."] };
  if (t === "partner_only")
    return { ...base, level: "hard", label: "Hard", why: ["OAuth access is limited to approved partners."] };

  const why: string[] = [];
  const review = g.approvals.filter((a) => a.kind === "verification" && a.owner === "provider");
  const admin = g.approvals.filter((a) => a.kind === "administrator");
  const dist = g.approvals.filter((a) => a.kind === "distribution");
  for (const a of review) why.push(`Provider review: ${a.title}`);
  if (g.launch.status === "blocked") why.push("Launch is gated until a provider review or approval completes.");
  for (const a of dist.slice(0, 1)) why.push(`Distribution gate: ${a.title}`);
  for (const a of admin.slice(0, 1)) why.push(`Admin approval: ${a.title}`);

  if (review.length || g.launch.status === "blocked")
    return { ...base, level: "hard", label: "Hard", why: why.slice(0, 3) };
  if (dist.length || admin.length || g.launch.status === "conditional")
    return {
      ...base,
      level: "moderate",
      label: "Moderate",
      why: (why.length ? why : ["Launch depends on conditions in your audience or organization."]).slice(0, 3),
    };
  return { ...base, level: "easy", label: "Easy", why: ["Documented self-serve registration; no review or admin gate found for this scenario."] };
}

export type AgentSplit = {
  did: string[];
  can: string[];
  you: { who: string; items: string[] }[];
};

const people: Record<string, string> = {
  developer: "You (developer)",
  administrator: "Your organization’s admin",
  user: "Each end user",
  provider: "The provider",
};

export function agentSplit(g: Guide): AgentSplit {
  const pages = g.sources.filter((s) => s.retrieval === "page" && s.official).length;
  const did: string[] = [];
  if (pages) did.push(`Read ${pages} official source${pages === 1 ? "" : "s"} and labelled every claim with its evidence.`);
  for (const a of g.attempts) {
    if (a.kind === "entry_point_check")
      did.push(`Checked an entry point without signing in — ${a.outcome}: ${a.observation.split(/(?<=\.)\s/)[0]}`);
    if (a.kind === "registration" || a.kind === "connection")
      did.push(`${a.kind === "registration" ? "Registration" : "Connection"} attempt — ${a.outcome}: ${a.observation.split(/(?<=\.)\s/)[0]}`);
  }
  did.push(
    `Mapped ${g.steps.length} step${g.steps.length === 1 ? "" : "s"}, ${g.permissions.length} permission${g.permissions.length === 1 ? "" : "s"} and ${g.approvals.length} approval${g.approvals.length === 1 ? "" : "s"}; left ${g.unresolvedQuestions.length} open question${g.unresolvedQuestions.length === 1 ? "" : "s"} visible.`,
  );
  const can = [
    "Draft your setup pack: app description, scope justifications, callback checklist and review notes.",
    "Diagnose a blocked step (“I’m stuck here”) against this guide’s sources.",
    "Re-read a step’s source to check whether the docs changed.",
    "Research this provider again for a different scenario.",
  ];
  const groups = new Map<string, string[]>();
  const add = (owner: string, item: string) => {
    if (owner === "agent") return;
    const key = people[owner] || owner;
    groups.set(key, [...(groups.get(key) || []), item]);
  };
  for (const s of g.steps) add(s.owner, s.title);
  for (const a of g.approvals) add(a.owner, a.title);
  const order = Object.values(people);
  const you = [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([who, items]) => ({ who, items: [...new Set(items)] }));
  return { did, can, you };
}
