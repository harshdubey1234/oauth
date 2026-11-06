/**
 * Runs the free live-research agent across every directory app without a reviewed guide and
 * records what it produced. Real public HTTPS requests; nothing is saved to D1.
 * Output: docs/directory-sweep.md (summary table) and outputs/directory-sweep.json (full rows).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { researchDocuments } from "../lib/docs-agent";
import { createPublicFetcher } from "../lib/public-fetch";
import { providerDirectory } from "../lib/provider-directory";

type Row = {
  name: string;
  identity: string;
  oauth: string;
  officialEvidence: number;
  sources: number;
  steps: number;
  permissions: number;
  endpoints: boolean;
  estimate: string;
  authorizeCheck: string;
  requests: number;
  seconds: number;
  error?: string;
};
const only = process.argv.slice(2);
const targets = providerDirectory.filter((e) => !e.guide && (!only.length || only.includes(e.name)));
const scenario = { actions: "Read the user's records", audience: "customers" as const, stage: "launch" as const, ownership: "own" as const };
const rows: Row[] = [];
async function run(name: string): Promise<Row> {
  let requests = 0;
  const network: typeof fetch = (i, init) => {
    requests++;
    return fetch(i, init);
  };
  const started = Date.now();
  try {
    const g = await researchDocuments({ provider: name, scenario }, async () => {}, { maxPages: 8, maxSources: 12 }, createPublicFetcher(undefined, network));
    return {
      name,
      identity: g.provider.identityStatus,
      oauth: g.oauthSupport.type,
      officialEvidence: g.evidence.filter((e) => e.kind === "official_docs").length,
      sources: g.sources.length,
      steps: g.steps.length,
      permissions: g.permissions.length,
      endpoints: g.steps.some((s) => s.id === "endpoints"),
      estimate: g.activeEffort[0]?.value || "",
      authorizeCheck: g.attempts.find((a) => a.id === "authorize-probe")?.outcome || "—",
      requests,
      seconds: (Date.now() - started) / 1000,
    };
  } catch (error) {
    return { name, identity: "-", oauth: "error", officialEvidence: 0, sources: 0, steps: 0, permissions: 0, endpoints: false, estimate: "", authorizeCheck: "—", requests, seconds: (Date.now() - started) / 1000, error: (error as Error).message };
  }
}
const queue = [...targets];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const e = queue.shift()!;
      const row = await run(e.name);
      rows.push(row);
      console.log(`${row.name.padEnd(18)} ${row.oauth.padEnd(12)} official=${String(row.officialEvidence).padEnd(3)} steps=${row.steps} perms=${row.permissions} endpoints=${row.endpoints ? "y" : "-"} req=${row.requests} ${row.seconds.toFixed(1)}s${row.error ? " ERR " + row.error : ""}`);
    }
  }),
);
rows.sort((a, b) => a.name.localeCompare(b.name));
const n = rows.length;
const count = (f: (r: Row) => boolean) => rows.filter(f).length;
const pct = (k: number) => `${k}/${n} (${Math.round((k / n) * 100)}%)`;
const summary = [
  `| Measure | Result |`,
  `| --- | --- |`,
  `| Apps researched live | ${n} |`,
  `| OAuth method established (oauth2 / oauth1 / partner-only) | ${pct(count((r) => ["oauth2", "oauth1", "partner_only"].includes(r.oauth)))} |`,
  `| Backed by official-docs evidence | ${pct(count((r) => r.officialEvidence > 0))} |`,
  `| Provider-specific setup steps (≥ 5) | ${pct(count((r) => r.steps >= 5))} |`,
  `| Scope candidates extracted | ${pct(count((r) => r.permissions > 0))} |`,
  `| Authorize/token endpoints extracted | ${pct(count((r) => r.endpoints))} |`,
  `| Hands-on estimate given | ${pct(count((r) => /hour/.test(r.estimate)))} |`,
  `| Authorization endpoint actually checked | ${pct(count((r) => r.authorizeCheck === "observed"))} |`,
  `| Median outbound requests per run (Workers cap: 50) | ${[...rows].map((r) => r.requests).sort((a, b) => a - b)[Math.floor(n / 2)]} (max ${Math.max(...rows.map((r) => r.requests))}) |`,
  `| Median duration | ${[...rows].map((r) => r.seconds).sort((a, b) => a - b)[Math.floor(n / 2)].toFixed(1)} s |`,
].join("\n");
const table = [
  `| App | Identity | OAuth | Official evidence | Steps | Scopes | Endpoints | Estimate | Authorize check |`,
  `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  ...rows.map(
    (r) =>
      `| ${r.name} | ${r.identity} | ${r.oauth} | ${r.officialEvidence} | ${r.steps} | ${r.permissions} | ${r.endpoints ? "yes" : "—"} | ${r.estimate || "—"} | ${r.authorizeCheck} |`,
  ),
].join("\n");
mkdirSync("outputs", { recursive: true });
writeFileSync("outputs/directory-sweep.json", JSON.stringify(rows, null, 2));
writeFileSync(
  "docs/directory-sweep.md",
  `# Live-research sweep — ${new Date().toISOString().slice(0, 10)}\n\nThe free research agent (no LLM, no paid API) was run once against every directory app that has no reviewed guide, with the scenario “read the user's records, external customers, launch”. Each run made real public HTTPS requests; nothing was saved. Reproduce with \`node scripts/directory-sweep.mjs\`.\n\n${summary}\n\nThese are extraction results, not correctness checks: “OAuth established” means the retrieved docs describe it, and every guide still labels unverified facts. Misses are listed so they can be fixed or given a directory entry point.\n\n${table}\n`,
);
console.log("\n" + summary);
