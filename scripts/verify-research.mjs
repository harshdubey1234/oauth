import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
const target = new URL(process.env.ATLAS_VERIFY_URL || "http://127.0.0.1:5173");
const local =
  target.protocol === "http:" &&
  ["127.0.0.1", "localhost"].includes(target.hostname) &&
  target.port === "5173";
if (
  !local &&
  !(target.protocol === "https:" && target.hostname.endsWith(".workers.dev"))
)
  throw new Error("Use the selected Worker URL or local preview.");
if (
  target.username ||
  target.password ||
  target.search ||
  target.hash ||
  target.pathname !== "/"
)
  throw new Error("Use only the app origin.");
const base = target.origin;
const request = (path, options = {}) =>
  fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(210000),
    redirect: "error",
  });
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log(`PASS ${message}`);
};
async function json(response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(`Expected JSON; HTTP ${response.status}.`);
  return response.json();
}
const status = await json(await request("/api/status"));
check(
  status.mode === "docs" && status.researchConfigured,
  "Free research is the deployed default",
);
const id = crypto.randomUUID();
const body = JSON.stringify({
  provider: "Notion",
  scenario: {
    actions: "Read selected pages for a weekly summary",
    audience: "customers",
    stage: "launch",
    ownership: "unsure",
  },
});
const post = () =>
  request("/api/research", {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      "Idempotency-Key": id,
    },
    body,
  });
const response = await post();
check(
  response.status === 200 &&
    response.headers.get("content-type")?.includes("text/event-stream"),
  "Live research starts a real stream",
);
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
const events = [];
let result;
let failure;
while (true) {
  const part = await reader.read();
  if (part.done) break;
  buffer += decoder.decode(part.value, { stream: true });
  let boundary;
  while ((boundary = buffer.indexOf("\n\n")) >= 0) {
    const packet = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary + 2);
    const kind = packet
      .split("\n")
      .find((l) => l.startsWith("event: "))
      ?.slice(7);
    const raw = packet
      .split("\n")
      .find((l) => l.startsWith("data: "))
      ?.slice(6);
    if (!raw) continue;
    const data = JSON.parse(raw);
    if (kind === "progress") {
      events.push(data);
      console.log(`LIVE ${data.stage}: ${data.detail}`);
    }
    if (kind === "done") result = data;
    if (kind === "error") failure = data.error;
  }
}
check(
  !!result && !failure,
  "Live research saves a completed or honest partial guide",
);
const guide = await json(await request("/api" + result.url));
check(
  guide.provider.name === "Notion" && guide.researchMethod === "docs",
  "Saved guide is a live docs result",
);
check(
  guide.sources.filter((s) => s.official && s.retrieval === "page").length >= 3,
  "Several official pages were actually retrieved",
);
check(
  guide.oauthSupport.type === "oauth2",
  "Retrieved documentation establishes an OAuth 2.0 method",
);
check(
  guide.permissions.some((p) => p.name === "Read content"),
  "Read-page scenario has a documented capability candidate",
);
check(
  guide.permissions.every(
    (p) => !["database.id", "bot.owner.user"].includes(p.name),
  ),
  "Property paths are excluded from permission candidates",
);
check(
  guide.evidence.every((e) => e.kind !== "tested"),
  "Research does not invent a successful OAuth setup",
);
const duplicate = await json(await post());
check(
  duplicate.url === result.url,
  "Duplicate submission reuses the durable guide",
);
const another = await json(
  await request("/api" + result.url, {
    headers: { "Cache-Control": "no-store" },
  }),
);
check(another.id === guide.id, "Shared guide reopens in a cookie-free request");
const html = await (await request(result.url)).text();
check(
  html.includes("YOUR NEXT ACTION") &&
    html.includes("Open source instructions"),
  "Generated guide renders with actionable source links",
);
const callback = guide.steps.find((s) => s.id === "callback");
check(!!callback, "A documented callback step was extracted");
const help = await request(`/api/guides/${guide.id}/help`, {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify({
    stepId: callback.id,
    problem: "The redirect URI gives a mismatch for this setup step",
    fresh: true,
  }),
});
const answer = await json(help);
check(
  help.status === 200 && answer.hypothesis.startsWith("Hypothesis:"),
  "Free contextual help returns a labelled hypothesis",
);
check(
  answer.sourceUrls.includes(callback.sourceUrl),
  "Help uses the selected step’s documentation",
);
check(
  answer.limitations.includes("retrieved again"),
  "Fresh source retrieval actually completed for help",
);
const library = await json(await request("/api/guides"));
check(
  !library.some((g) => g.id === guide.id),
  "Scenario-specific guide stays out of public library",
);
const job = await json(await request(`/api/jobs/${id}`));
check(
  job.url === result.url && job.events.some((e) => e.stage === "saving"),
  "Durable job records retain progress and final URL",
);
mkdirSync("outputs", { recursive: true });
const report = {
  at: new Date().toISOString(),
  base,
  checks,
  guideUrl: base + result.url,
  guideId: guide.id,
  method: guide.researchMethod,
  researchStatus: guide.researchStatus,
  sourceUrls: guide.sources.map((s) => s.url),
  events,
  helpFreshVerified: true,
};
writeFileSync(
  `outputs/verification-${new URL(base).hostname.replaceAll(".", "-")}.json`,
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    checks,
    guideUrl: report.guideUrl,
    method: guide.researchMethod,
    status: guide.researchStatus,
    paidModelRequests: 0,
  }),
);
