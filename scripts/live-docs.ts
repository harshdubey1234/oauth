import { writeFileSync, mkdirSync } from "node:fs";
import { researchDocuments, documentHelp } from "../lib/docs-agent";
import { createPublicFetcher } from "../lib/public-fetch";
const provider = process.argv[2] || "Notion";
const events: { stage: string; detail: string; at: string }[] = [];
const read = createPublicFetcher(AbortSignal.timeout(170000));
const guide = await researchDocuments(
  {
    provider,
    scenario: {
      actions: "Read selected pages or issues for a weekly summary",
      audience: "customers",
      stage: "launch",
      ownership: "unsure",
    },
  },
  async (stage, detail) => {
    events.push({ stage, detail, at: new Date().toISOString() });
    console.log(`${stage}: ${detail}`);
  },
  { maxPages: 8, maxSources: 12 },
  read,
);
mkdirSync("outputs", { recursive: true });
const stem = provider.toLowerCase().replace(/[^a-z0-9]+/g, "-");
writeFileSync(
  `outputs/live-${stem}.json`,
  JSON.stringify({ guide, events }, null, 2),
);
console.log(
  JSON.stringify({
    id: guide.id,
    provider: guide.provider,
    researchStatus: guide.researchStatus,
    method: guide.researchMethod,
    auth: guide.oauthSupport.type,
    sources: guide.sources.map((s) => s.url),
    permissions: guide.permissions.map((p) => p.name),
    steps: guide.steps.map((s) => s.id),
    next: guide.nextAction,
  }),
);
const step = guide.steps.find((s) => s.id === "callback") || guide.steps[0];
if (step) {
  const answer = await documentHelp(
    guide,
    step.id,
    "A redirect mismatch or permission error blocks this step",
    false,
  );
  console.log(
    JSON.stringify({
      help: {
        hypothesis: answer.hypothesis,
        diagnostic: answer.diagnostic,
        sources: answer.sourceUrls,
      },
    }),
  );
}
