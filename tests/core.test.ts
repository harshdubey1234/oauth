import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { preparedGuides } from "../lib/guides";
import {
  guideSchema,
  markMissingEvidence,
  researchInputSchema,
  type Guide,
} from "../lib/schema";
import {
  safePublicUrl,
  validateProviderInput,
  containsSecret,
  readJson,
} from "../lib/security";
import {
  researchGuide,
  sourcesFrom,
  troubleshoot,
  type ResearchAdapter,
  type ResponseOutput,
} from "../lib/research";
import {
  saveGuide,
  getGuide,
  getLibrary,
  startJob,
  getJob,
  updateJob,
  consumeQuota,
} from "../lib/store";
import { guideMarkdown, setupPack } from "../lib/export";
import { reopen, env } from "./sqlite-d1";
import { POST } from "../app/api/research/route";
import { POST as helpPost } from "../app/api/guides/[id]/help/route";
import "./docs.test";

test("prepared guides validate; only the recorded GitHub OAuth App run is labelled tested", () => {
  assert.deepEqual(
    preparedGuides.slice(0, 4).map((g) => g.provider.name),
    ["GitHub", "Slack", "Gmail", "Tally"],
  );
  assert.ok(preparedGuides.length >= 20, `expected 20+ guides, got ${preparedGuides.length}`);
  assert.equal(new Set(preparedGuides.map((g) => g.id)).size, preparedGuides.length);
  for (const g of preparedGuides) {
    assert.ok(guideSchema.safeParse(g).success);
    const tested = g.evidence.filter((e) => e.kind === "tested");
    assert.equal(tested.length, g.id === "github" ? 1 : 0, `${g.id} tested claims`);
    assert.ok(g.steps.every((s) => s.completion));
  }
  // The single tested claim must point at a succeeded connection attempt matching the saved record.
  const gh = preparedGuides[0];
  const claim = gh.evidence.find((e) => e.kind === "tested")!;
  const attempt = gh.attempts.find((a) => a.id === claim.testId)!;
  assert.equal(attempt.kind, "connection");
  assert.equal(attempt.outcome, "succeeded");
  const record = JSON.parse(readFileSync("docs/oauth-smoke-github.json", "utf8"));
  assert.equal(record.outcome, "succeeded");
  assert.equal(record.apiCall.status, 200);
  assert.equal(attempt.at, record.apiCall.at);
  assert.ok(!/access_token|client_secret|gho_/.test(JSON.stringify(record)), "record holds no secrets");
  assert.equal(preparedGuides[2].launch.status, "blocked");
});
test("independent Tally guide distinguishes MCP OAuth, broad API keys and unverified launch", () => {
  const g = preparedGuides.find((guide) => guide.id === "tally")!;
  assert.equal(g.oauthSupport.type, "oauth2");
  assert.match(g.oauthSupport.finding.text, /MCP/);
  assert.equal(g.managedAuth.status, "unverified");
  assert.equal(g.launch.status, "conditional");
  assert.equal(g.researchStatus, "partial");
  assert.match(
    g.permissions.find((p) => p.name.includes("API key"))!.rationale.text,
    /all that user's resources/,
  );
  assert.match(
    g.steps.find((s) => s.id === "preview-digest")!.detail.text,
    /without expiry/,
  );
  assert.ok(
    g.sources.every(
      (s) => s.contentHash?.length === 64 && s.retrieval === "page",
    ),
  );
  assert.ok(g.attempts.every((a) => a.outcome === "observed"));
  assert.match(guideMarkdown(g), /No client was registered/);
  assert.match(setupPack(g), /DRAFT/);
});
test("schema rejects malformed guides and unknown source references", () => {
  assert.equal(guideSchema.safeParse({ title: "only a title" }).success, false);
  const g = structuredClone(preparedGuides[0]);
  g.evidence[0].sourceIds = ["invented"];
  assert.equal(guideSchema.safeParse(g).success, false);
});
test("official label requires completed official page retrieval", () => {
  const g = structuredClone(preparedGuides[0]);
  g.sources[0].retrieval = "search";
  assert.equal(guideSchema.safeParse(g).success, false);
});
test("missing evidence becomes explicit unknown rather than documentation evidence", () => {
  const g = structuredClone(preparedGuides[0]);
  g.nextAction = "Check the documented facts";
  g.testing.summary.evidenceIds = [];
  const result = markMissingEvidence(g);
  assert.ok(guideSchema.safeParse(result).success);
  assert.equal(
    result.evidence.find((e) => e.id === "missing_evidence")?.kind,
    "unverified",
  );
});
test("tested badges cannot be manufactured from a documentation review", () => {
  const g = structuredClone(preparedGuides[0]);
  g.evidence[0] = { ...g.evidence[0], kind: "tested", testId: "review" };
  assert.equal(guideSchema.safeParse(g).success, false);
});
test("dependencies reject missing steps and cycles", () => {
  const g = structuredClone(preparedGuides[0]);
  g.steps[0].dependsOn = ["no-step"];
  assert.equal(guideSchema.safeParse(g).success, false);
  g.steps[0].dependsOn = ["register"];
  assert.equal(guideSchema.safeParse(g).success, false);
});
test("unsafe destinations and credential-bearing URL inputs are blocked", () => {
  for (const url of [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "https://localhost",
    "https://foo.internal",
    "https://foo.local",
    "https://127.0.0.1.nip.io",
    "https://name:secret@example.com",
    "https://example.com:8080",
  ])
    assert.equal(safePublicUrl(url), false, url);
  assert.equal(
    safePublicUrl(
      "https://developers.notion.com/guides/authorization/overview",
    ),
    true,
  );
  assert.throws(() =>
    validateProviderInput("https://example.com?token=secret"),
  );
});
test("input length and common secret formats are rejected", () => {
  assert.equal(
    researchInputSchema.safeParse({ provider: "x", scenario: {} }).success,
    false,
  );
  assert.equal(
    researchInputSchema.safeParse({
      provider: "Notion",
      scenario: { actions: "x".repeat(601) },
    }).success,
    false,
  );
  assert.equal(containsSecret("client_secret=reallysecretvalue"), true);
  assert.equal(containsSecret("Bearer abcdefghijklmnop"), true);
  assert.equal(containsSecret("A redacted authorization error"), false);
});
test("body size is bounded even without Content-Length", async () => {
  await assert.rejects(
    () =>
      readJson(
        new Request("https://atlas.example/api/research", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value: "a".repeat(10000) }),
        }),
      ),
    /too large/,
  );
});
test("durable SQLite guide reopens after database connection restart and remains unlisted", async () => {
  const g = structuredClone(preparedGuides[0]);
  g.id = crypto.randomUUID();
  await saveGuide(g);
  reopen();
  assert.equal((await getGuide(g.id))?.title, g.title);
  assert.equal(
    (await getLibrary()).some((x) => x.id === g.id),
    false,
  );
  assert.equal((await getLibrary()).length, preparedGuides.length);
});
test("job deduplication and progress survive connection restart", async () => {
  const id = crypto.randomUUID();
  assert.equal(await startJob(id, "hash-a"), true);
  assert.equal(await startJob(id, "hash-a"), false);
  await updateJob(
    id,
    [
      {
        stage: "identity",
        detail: "An actual search is starting",
        at: new Date().toISOString(),
      },
    ],
    "partial",
    "guide-id",
  );
  reopen();
  const job = await getJob(id);
  assert.equal(job?.guide_id, "guide-id");
  assert.equal(JSON.parse(job!.events)[0].stage, "identity");
});
test("durable request quota has an atomic limit", async () => {
  assert.equal(await consumeQuota("test-caller", 2), true);
  assert.equal(await consumeQuota("test-caller", 2), true);
  assert.equal(await consumeQuota("test-caller", 2), false);
});
const receipt = (url: string): ResponseOutput => ({
  type: "web_search_call",
  status: "completed",
  action: { type: "open_page", url },
});
const output = (value: string): ResponseOutput => ({
  type: "message",
  content: [{ type: "output_text", text: value }],
});
class MockResearch implements ResearchAdapter {
  searches = 0;
  structuredInputs: unknown[] = [];
  constructor(
    private mode:
      | "notion"
      | "ambiguous"
      | "api_key"
      | "fail_after_discovery" = "notion",
  ) {}
  async search() {
    this.searches++;
    if (this.mode === "fail_after_discovery" && this.searches === 2)
      throw new Error("simulated outage");
    return {
      output: [
        receipt("https://developers.notion.com/guides/authorization/overview"),
        output(
          "Synthetic test report. Notion documents OAuth 2.0 and internal connection tokens. This is a mocked adapter, not a live run.",
        ),
      ],
    };
  }
  async structured<T extends z.ZodTypeAny>(
    _instructions: string,
    input: unknown,
    schema: T,
  ): Promise<z.output<T>> {
    this.structuredInputs.push(input);
    let value: unknown;
    if (this.structuredInputs.length === 1)
      value = {
        name: "Notion",
        domain: "notion.com",
        officialDomains: ["notion.com"],
        status: this.mode === "ambiguous" ? "ambiguous" : "resolved",
        question:
          this.mode === "ambiguous"
            ? "Which official provider website do you mean?"
            : "",
      };
    else if (this.structuredInputs.length === 2) {
      const clone: Guide = structuredClone(preparedGuides[0]);
      clone.provider = {
        name: "Notion",
        domain: "notion.com",
        identityStatus: "resolved",
      };
      clone.evidence.forEach((e) => {
        e.kind = "unverified";
        e.sourceIds = [];
      });
      clone.oauthSupport.type = this.mode === "api_key" ? "api_key" : "oauth2";
      clone.researchStatus =
        this.mode === "api_key" ? "unsupported" : "partial";
      clone.title = "Synthetic Notion workflow fixture";
      if (this.mode === "api_key") clone.steps = [];
      value = Object.fromEntries(
        Object.entries(clone).filter(
          ([key]) =>
            !["id", "sources", "researchedAt", "attempts"].includes(key),
        ),
      );
    } else value = { unsupportedEvidenceIds: [], notes: [] };
    return schema.parse(value);
  }
}
const input = {
  provider: "Notion",
  scenario: {
    actions: "Read selected pages",
    audience: "organization" as const,
    stage: "test" as const,
    ownership: "unsure" as const,
  },
};
test("unfamiliar provider workflow produces validated guide with actual-stage events (mocked model/search)", async () => {
  const adapter = new MockResearch();
  const stages: string[] = [];
  const result = await researchGuide(
    input,
    adapter,
    async (stage) => {
      stages.push(stage);
    },
    { maxSources: 8 },
  );
  assert.equal(result.provider.name, "Notion");
  assert.equal(adapter.searches, 2);
  assert.deepEqual(stages, [
    "identity",
    "documentation",
    "requirements",
    "evidence",
  ]);
  assert.ok(guideSchema.safeParse(result).success);
});
test("ambiguous name asks for clarification without a fabricated setup walkthrough (mocked)", async () => {
  const adapter = new MockResearch("ambiguous");
  const g = await researchGuide(input, adapter, async () => {}, {
    maxSources: 8,
  });
  assert.equal(g.researchStatus, "needs_clarification");
  assert.equal(g.steps.length, 0);
  assert.match(g.nextAction, /website/);
  assert.equal(adapter.searches, 1);
});
test("API-key-only result can be unsupported without OAuth instructions (mocked)", async () => {
  const g = await researchGuide(
    input,
    new MockResearch("api_key"),
    async () => {},
    { maxSources: 8 },
  );
  assert.equal(g.researchStatus, "unsupported");
  assert.equal(g.oauthSupport.type, "api_key");
  assert.equal(g.steps.length, 0);
});
test("retrieval failure saves useful partial evidence instead of invented requirements (mocked)", async () => {
  const g = await researchGuide(
    input,
    new MockResearch("fail_after_discovery"),
    async () => {},
    { maxSources: 8 },
  );
  assert.equal(g.researchStatus, "partial");
  assert.ok(g.sources.length);
  assert.equal(g.steps.length, 0);
  assert.match(g.summary, /stopped/);
});
test("search snippets and incomplete opens do not receive page retrieval status", () => {
  const sources = sourcesFrom(
    {
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: {
            type: "search",
            sources: [{ url: "https://notion.com/docs", title: "Lead" }],
          },
        },
        {
          type: "web_search_call",
          status: "failed",
          action: { type: "open_page", url: "https://notion.com/docs" },
        },
      ],
    },
    ["notion.com"],
    6,
  );
  assert.equal(sources[0].retrieval, "search");
});
test("contextual assistant receives selected guide, scenario, step and evidence; invented links removed (mocked)", async () => {
  let captured: unknown;
  const adapter: ResearchAdapter = {
    search: async () => ({ output: [] }),
    structured: async (_instructions, input, schema) => {
      captured = input;
      return schema.parse({
        hypothesis: "Hypothesis: installer access is insufficient.",
        diagnostic: "Check who owns this repository.",
        action: "Ask the authorized owner to check app installation.",
        owner: "administrator",
        fallback: "Inspect the current official documentation.",
        evidenceIds: ["models", "invented"],
        sourceUrls: ["https://invented-provider.com/help"],
        limitations: "No fix was tested.",
      });
    },
  };
  const g = preparedGuides[0];
  const answer = await troubleshoot(
    g,
    "install",
    "The repository is missing from my installation",
    false,
    adapter,
  );
  assert.equal((captured as { step: { id: string } }).step.id, "install");
  assert.deepEqual((captured as { scenario: unknown }).scenario, g.scenario);
  assert.deepEqual(answer.evidenceIds, ["models"]);
  assert.equal(answer.sourceUrls.length, 0);
});
test("configuration-required, unsafe-input, and cross-origin API responses are honest", async () => {
  const request = (provider: string, origin = "https://atlas.example") =>
    new Request("https://atlas.example/api/research", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ provider, scenario: input.scenario }),
    });
  const unconfigured = await POST(request("Notion"));
  assert.equal(unconfigured.status, 503);
  assert.match(await unconfigured.text(), /configuration_required/);
  assert.equal((await POST(request("http://127.0.0.1"))).status, 400);
  assert.equal(
    (await POST(request("Notion", "https://attacker.example"))).status,
    400,
  );
});
test("contextual-help API rejects absent steps and gives honest missing-key state", async () => {
  const req = (stepId: string) =>
    new Request("https://atlas.example/api/guides/github/help", {
      method: "POST",
      headers: {
        origin: "https://atlas.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ stepId, problem: "A redacted permission issue" }),
    });
  assert.equal(
    (
      await helpPost(req("missing"), {
        params: Promise.resolve({ id: "github" }),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await helpPost(req("install"), {
        params: Promise.resolve({ id: "github" }),
      })
    ).status,
    503,
  );
});
test("exports retain source evidence and truthful placeholders, excluding private progress", () => {
  const markdown = guideMarkdown(preparedGuides[2]);
  assert.match(markdown, /Retrieved sources/);
  assert.match(markdown, /No project, client/);
  assert.match(setupPack(preparedGuides[2]), /\[PRODUCT NAME\]/);
  assert.match(setupPack(preparedGuides[2]), /DRAFT/);
  assert.doesNotMatch(markdown, /atlas-checklist/);
});
test("request-bound SSE persists progress and guide; duplicate submission reuses result (mocked OpenAI HTTP)", async () => {
  const originalFetch = globalThis.fetch;
  env.OPENAI_API_KEY = "test-placeholder-never-transmitted";
  const identity = {
    name: "Notion",
    domain: "notion.com",
    officialDomains: ["notion.com"],
    status: "resolved",
    question: "",
  };
  const clone = structuredClone(preparedGuides[0]);
  clone.provider = {
    name: "Notion",
    domain: "notion.com",
    identityStatus: "resolved",
  };
  clone.evidence.forEach((e) => {
    e.kind = "unverified";
    e.sourceIds = [];
  });
  clone.title = "Mocked HTTP integration fixture";
  const draft = Object.fromEntries(
    Object.entries(clone).filter(
      ([key]) => !["id", "sources", "researchedAt", "attempts"].includes(key),
    ),
  );
  const scripted = [
    {
      output: [
        receipt("https://developers.notion.com/guides/authorization/overview"),
        output("Mocked official identity report"),
      ],
    },
    { output: [output(JSON.stringify(identity))] },
    {
      output: [
        receipt("https://developers.notion.com/guides/authorization/overview"),
        output("Mocked documentation report"),
      ],
    },
    { output: [output(JSON.stringify(draft))] },
    {
      output: [
        output(JSON.stringify({ unsupportedEvidenceIds: [], notes: [] })),
      ],
    },
  ];
  let calls = 0;
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const next = scripted[calls++];
    assert.ok(next);
    return Response.json({ status: "completed", ...next });
  };
  const jobId = crypto.randomUUID();
  const request = () =>
    new Request("https://atlas.example/api/research", {
      method: "POST",
      headers: {
        origin: "https://atlas.example",
        "content-type": "application/json",
        "idempotency-key": jobId,
      },
      body: JSON.stringify(input),
    });
  try {
    const response = await POST(request());
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    const text = await response.text();
    assert.match(text, /event: progress/);
    assert.match(text, /Saving the guide/);
    assert.match(text, /event: done/);
    assert.equal(calls, 5);
    const job = await getJob(jobId);
    assert.ok(job?.guide_id);
    assert.ok(await getGuide(job!.guide_id!));
    const duplicate = await POST(request());
    assert.equal(duplicate.status, 200);
    assert.match(await duplicate.text(), /guides\//);
    assert.equal(calls, 5);
  } finally {
    globalThis.fetch = originalFetch;
    delete env.OPENAI_API_KEY;
  }
});
test("model outage emits an honest SSE error and persists failed status (mocked OpenAI HTTP)", async () => {
  const originalFetch = globalThis.fetch;
  env.OPENAI_API_KEY = "test-placeholder-never-transmitted";
  globalThis.fetch = async () => {
    throw new Error("Synthetic network failure");
  };
  const jobId = crypto.randomUUID();
  try {
    const response = await POST(
      new Request("https://atlas.example/api/research", {
        method: "POST",
        headers: {
          origin: "https://atlas.example",
          "content-type": "application/json",
          "idempotency-key": jobId,
        },
        body: JSON.stringify(input),
      }),
    );
    assert.match(await response.text(), /event: error/);
    assert.equal((await getJob(jobId))?.status, "failed");
  } finally {
    globalThis.fetch = originalFetch;
    delete env.OPENAI_API_KEY;
  }
});
