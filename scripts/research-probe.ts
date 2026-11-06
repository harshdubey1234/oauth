/**
 * Developer diagnostic: run free docs research for providers from the command line and report
 * outbound request counts (Workers caps subrequests per invocation) and the resulting guide shape.
 * Usage: node scripts/research-probe.mjs "Calendly" "Attio" ...   (built by scripts/research-probe.mjs)
 */
import { researchDocuments } from "../lib/docs-agent";
import { createPublicFetcher } from "../lib/public-fetch";

const scenario = { actions: "Read the user's records", audience: "customers" as const, stage: "launch" as const, ownership: "own" as const };
for (const provider of process.argv.slice(2)) {
  let requests = 0;
  const counting: typeof fetch = (input, init) => {
    requests++;
    return fetch(input, init);
  };
  const started = Date.now();
  const events: string[] = [];
  const g = await researchDocuments(
    { provider, scenario },
    async (_stage, detail) => {
      events.push(detail);
    },
    { maxPages: 8, maxSources: 12 },
    createPublicFetcher(undefined, counting),
  );
  const official = g.evidence.filter((e) => e.kind === "official_docs").length;
  console.log(`\n=== ${provider} → ${g.provider.name} [${g.provider.identityStatus}] ${((Date.now() - started) / 1000).toFixed(1)}s · ${requests} outbound requests`);
  console.log(`  oauth=${g.oauthSupport.type} sources=${g.sources.length} official=${official} perms=${g.permissions.map((p) => p.name).join(", ") || "-"}`);
  console.log(`  effort=${g.activeEffort[0]?.value} · waiting=${g.externalWaiting[0]?.value} [${g.externalWaiting[0]?.basis}]`);
  console.log(`  steps: ${g.steps.map((s) => s.title).join(" | ") || "-"}`);
  console.log(`  blockers: ${g.blockers.map((b) => b.title).join(" | ")}`);
  for (const a of g.attempts) console.log(`  attempt ${a.kind}/${a.outcome}: ${a.observation.slice(0, 150)}`);
  if (process.env.EVENTS) for (const e of events) console.log(`    · ${e}`);
  if (process.env.EVENTS) console.log(`    unresolved: ${g.unresolvedQuestions.slice(-4).join(" | ")}`);
  console.log(`  pages: ${g.sources.map((s) => new URL(s.url).host + new URL(s.url).pathname).join("  ")}`);
}
