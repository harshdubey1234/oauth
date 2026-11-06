import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.ATLAS_VERIFY_URL || "http://127.0.0.1:5173";
const results = [];
function check(ok, name) {
  assert.ok(ok, name);
  results.push(name);
  console.log(`PASS ${name}`);
}
const homeResponse = await fetch(base);
const home = await homeResponse.text();
check(
  homeResponse.ok &&
    home.includes('href="/guides/tally"') &&
    home.includes("Independent pick"),
  "Independent-pick card links to the Tally guide",
);
const library = await fetch(`${base}/api/guides`).then((r) => r.json());
check(
  library.length === 4 &&
    ["github", "slack", "gmail", "tally"].every((id) =>
      library.some((g) => g.id === id),
    ),
  "All four prepared guides appear in the public library",
);
const pageResponse = await fetch(`${base}/guides/tally`);
const page = await pageResponse.text();
check(
  pageResponse.ok &&
    page.includes("YOUR NEXT ACTION") &&
    page.includes("Turn intake responses into a weekly digest") &&
    page.includes("INDEPENDENT PICK"),
  "Tally shared page renders its next action and independent-pick label",
);
const guideResponse = await fetch(`${base}/api/guides/tally`, {
  headers: { "Cache-Control": "no-cache" },
});
const g = await guideResponse.json();
check(
  guideResponse.ok &&
    g.id === "tally" &&
    g.oauthSupport.type === "oauth2" &&
    g.researchStatus === "partial" &&
    g.managedAuth.status === "unverified",
  "Cookie-free guide API preserves documented OAuth and explicit unknowns",
);
check(
  g.sources.length === 7 &&
    g.sources.every(
      (s) =>
        s.official &&
        s.retrieval === "page" &&
        /^[a-f0-9]{64}$/.test(s.contentHash),
    ),
  "Seven official source receipts retain content fingerprints",
);
check(
  g.attempts.every((a) => a.outcome === "observed") &&
    !g.evidence.some((e) => e.kind === "tested"),
  "Documentation observations are not promoted to successful provider connections",
);
const step = g.steps.find((s) => s.id === "preview-digest");
check(
  step.detail.text.includes("without expiry") &&
    g.permissions.some((p) =>
      p.rationale.text.includes("all that user's resources"),
    ),
  "Guide retains the response-link and credential-boundary findings",
);
const helpResponse = await fetch(`${base}/api/guides/tally/help`, {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify({
    stepId: step.id,
    problem:
      "The redacted preview contains response links; which fields should I exclude?",
    fresh: false,
  }),
});
const help = await helpResponse.json();
check(
  helpResponse.ok &&
    help.hypothesis.startsWith("Hypothesis:") &&
    help.sourceUrls.includes(step.sourceUrl),
  "Tally contextual help uses the selected step's evidence",
);
await mkdir("outputs", { recursive: true });
const report = {
  origin: base,
  checkedAt: new Date().toISOString(),
  checks: results,
  browserInteractionTested: false,
  providerAuthorizationTested: false,
};
await writeFile(
  `outputs/tally-verification-${new URL(base).hostname}.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(`${results.length} Tally HTTP checks passed.`);
