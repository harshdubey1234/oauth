import { z } from "zod";
import { safePublicUrl } from "./security";

const text = z.string().min(1).max(1800);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const scenarioSchema = z.object({
  actions: z.string().max(600).default(""),
  audience: z
    .enum(["me", "organization", "customers", "unsure"])
    .default("unsure"),
  stage: z.enum(["test", "launch"]).default("test"),
  ownership: z.enum(["managed", "own", "unsure"]).default("unsure"),
});
export const researchInputSchema = z.object({
  provider: z.string().trim().min(2).max(160),
  scenario: scenarioSchema,
});
export const claimSchema = z.object({ text, evidenceIds: z.array(id).max(8) });
const owner = z.enum([
  "agent",
  "developer",
  "administrator",
  "provider",
  "user",
]);
export const sourceSchema = z.object({
  id,
  title: z.string().min(1).max(240),
  url: z.string().refine(safePublicUrl, "Unsafe source URL"),
  retrievedAt: z.string().datetime(),
  retrieval: z.enum(["page", "search"]),
  official: z.boolean(),
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  excerpt: z.string().max(400).optional(),
});
export const evidenceSchema = z.object({
  id,
  kind: z.enum(["official_docs", "estimate", "unverified", "tested"]),
  sourceIds: z.array(id).max(8),
  note: text,
  conditions: text,
  testId: id.nullable(),
});
const readiness = z.object({
  status: z.enum(["action_needed", "conditional", "blocked", "unknown"]),
  summary: claimSchema,
  nextAction: text,
});
const estimate = z.object({
  label: text,
  value: text,
  basis: z.enum(["observed", "provider_published", "estimated", "unknown"]),
  assumptions: text,
  evidenceIds: z.array(id),
});
export const stepSchema = z.object({
  id,
  title: text,
  detail: claimSchema,
  owner,
  path: z.enum(["test", "launch", "both"]),
  completion: text,
  dependsOn: z.array(id),
  sourceUrl: z.string().refine(safePublicUrl).optional(),
});
export const baseGuideSchema = z.object({
  id,
  schemaVersion: z.literal(1),
  researchMethod: z.enum(["curated", "docs", "model"]).default("curated"),
  provider: z.object({
    name: z.string().min(1).max(100),
    domain: z.string().max(180),
    identityStatus: z.enum(["resolved", "ambiguous", "unverified"]),
  }),
  scenario: scenarioSchema,
  title: z.string().min(1).max(180),
  summary: text,
  assumptions: z.array(text).max(12),
  researchStatus: z.enum([
    "complete",
    "partial",
    "unsupported",
    "needs_clarification",
  ]),
  oauthSupport: z.object({
    type: z.enum(["oauth2", "oauth1", "api_key", "partner_only", "unknown"]),
    finding: claimSchema,
  }),
  managedAuth: z.object({
    status: z.enum(["available", "unavailable", "unverified"]),
    finding: claimSchema,
  }),
  recommendedPath: claimSchema,
  testing: readiness,
  launch: readiness,
  prerequisites: z
    .array(z.object({ title: text, owner, detail: claimSchema }))
    .max(12),
  permissions: z
    .array(z.object({ name: text, rationale: claimSchema, condition: text }))
    .max(20),
  steps: z.array(stepSchema).max(18),
  approvals: z
    .array(
      z.object({
        title: text,
        kind: z.enum([
          "consent",
          "administrator",
          "verification",
          "distribution",
        ]),
        owner,
        detail: claimSchema,
      }),
    )
    .max(12),
  activeEffort: z.array(estimate).max(6),
  prerequisitesEffort: z.array(estimate).max(6),
  externalWaiting: z.array(estimate).max(6),
  blockers: z
    .array(z.object({ title: text, recovery: claimSchema, owner }))
    .max(12),
  nextAction: text,
  sources: z.array(sourceSchema).max(24),
  evidence: z.array(evidenceSchema).max(80),
  attempts: z
    .array(
      z.object({
        id,
        kind: z.enum([
          "documentation_review",
          "entry_point_check",
          "registration",
          "connection",
        ]),
        at: z.string().datetime(),
        action: text,
        observation: text,
        outcome: z.enum(["observed", "blocked", "succeeded", "failed"]),
        stoppedAt: text,
        humanNext: text,
      }),
    )
    .max(12),
  unresolvedQuestions: z.array(text).max(16),
  researchedAt: z.string().datetime(),
});
export type Guide = z.infer<typeof baseGuideSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Source = z.infer<typeof sourceSchema>;
export const helpInputSchema = z.object({
  stepId: id,
  problem: z.string().trim().min(8).max(1600),
  fresh: z.boolean().default(false),
});
export const helpSchema = z.object({
  hypothesis: text,
  diagnostic: text,
  action: text,
  owner,
  fallback: text,
  evidenceIds: z.array(id),
  sourceUrls: z.array(z.string().refine(safePublicUrl)).max(8),
  limitations: text,
});

export function claimsOf(g: Guide): Claim[] {
  return [
    g.oauthSupport.finding,
    g.managedAuth.finding,
    g.recommendedPath,
    g.testing.summary,
    g.launch.summary,
    ...g.prerequisites.map((x) => x.detail),
    ...g.permissions.map((x) => x.rationale),
    ...g.steps.map((x) => x.detail),
    ...g.approvals.map((x) => x.detail),
    ...g.blockers.map((x) => x.recovery),
  ];
}
export const guideSchema = baseGuideSchema.superRefine((g, ctx) => {
  const fail = (message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const sources = new Map(g.sources.map((s) => [s.id, s]));
  const evidence = new Map(g.evidence.map((e) => [e.id, e]));
  const tests = new Map(g.attempts.map((t) => [t.id, t]));
  const steps = new Map(g.steps.map((s) => [s.id, s]));
  if (
    sources.size !== g.sources.length ||
    evidence.size !== g.evidence.length ||
    steps.size !== g.steps.length ||
    tests.size !== g.attempts.length
  )
    fail("Duplicate IDs");
  for (const e of g.evidence) {
    if (e.sourceIds.some((s) => !sources.has(s)))
      fail(`Unknown source on ${e.id}`);
    if (
      e.kind === "official_docs" &&
      (!e.sourceIds.length ||
        e.sourceIds.some(
          (s) =>
            !sources.get(s)?.official || sources.get(s)?.retrieval !== "page",
        ))
    )
      fail(`Official claim ${e.id} needs a retrieved official page`);
    if (e.kind === "tested") {
      const t = e.testId ? tests.get(e.testId) : undefined;
      if (
        !t ||
        !["registration", "connection"].includes(t.kind) ||
        t.outcome !== "succeeded"
      )
        fail(
          `Tested evidence ${e.id} needs an observed successful setup attempt`,
        );
    }
    if (e.kind === "estimate" && !e.conditions.trim())
      fail("Estimate needs assumptions");
  }
  for (const claim of [
    ...claimsOf(g),
    ...g.activeEffort,
    ...g.externalWaiting,
    ...g.prerequisitesEffort,
  ]) {
    if (
      !claim.evidenceIds.length ||
      claim.evidenceIds.some((e) => !evidence.has(e))
    )
      fail("Every claim needs valid evidence or an explicit unverified label");
  }
  for (const s of g.steps)
    if (s.dependsOn.some((d) => !steps.has(d) || d === s.id))
      fail("Invalid step dependency");
  for (const s of g.steps)
    if (s.sourceUrl && !g.sources.some((source) => source.url === s.sourceUrl))
      fail("Step link must point to a retrieved source");
  const visit = (key: string, path: Set<string>): boolean =>
    path.has(key) ||
    (steps.get(key)?.dependsOn.some((d) => visit(d, new Set([...path, key]))) ??
      false);
  if (g.steps.some((s) => visit(s.id, new Set())))
    fail("Cyclic step dependencies");
});

/** Missing evidence is displayed as unknown, never silently promoted to docs-backed. */
export function markMissingEvidence(g: Guide): Guide {
  const result = structuredClone(g);
  const known = new Set(result.evidence.map((e) => e.id));
  const unknownId = "missing_evidence";
  for (const c of [
    ...claimsOf(result),
    ...result.activeEffort,
    ...result.prerequisitesEffort,
    ...result.externalWaiting,
  ]) {
    if (!c.evidenceIds.length) c.evidenceIds = [unknownId];
    for (const ref of c.evidenceIds)
      if (!known.has(ref)) {
        result.evidence.push({
          id: ref,
          kind: "unverified",
          sourceIds: [],
          note: "Reliable supporting evidence was not established.",
          conditions:
            "Confirm against current official documentation before acting.",
          testId: null,
        });
        known.add(ref);
      }
  }
  if (
    result.evidence.some((e) => e.kind === "unverified") &&
    result.researchStatus === "complete"
  )
    result.researchStatus = "partial";
  return result;
}
