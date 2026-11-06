import { getGuide, consumeQuota } from "@/lib/store";
import { helpInputSchema } from "@/lib/schema";
import { checkOrigin, containsSecret, digest, readJson } from "@/lib/security";
import { runtimeConfig } from "@/lib/config";
import { OpenAIAdapter, troubleshoot } from "@/lib/research";
import { documentHelp } from "@/lib/docs-agent";
import { createPublicFetcher } from "@/lib/public-fetch";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await readJson(request);
    checkOrigin(request);
    const parsed = helpInputSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        { error: "Describe the issue in 8–1600 characters." },
        { status: 400 },
      );
    if (containsSecret(parsed.data.problem))
      return Response.json(
        { error: "Remove tokens, secrets, and passwords before submitting." },
        { status: 400 },
      );
    const { id } = await params;
    const guide = await getGuide(id);
    if (!guide || !guide.steps.some((s) => s.id === parsed.data.stepId))
      return Response.json(
        { error: "Guide or step not found." },
        { status: 404 },
      );
    const config = runtimeConfig();
    if (config.mode === "openai" && !config.apiKey)
      return Response.json(
        {
          error:
            "Optional model help is not configured. Free evidence-guided help is available in docs mode.",
        },
        { status: 503 },
      );
    const caller = await digest(
      request.headers.get("oai-authenticated-user-id") ||
        request.headers.get("cf-connecting-ip") ||
        "local-preview",
    );
    if (
      !(await consumeQuota(`help:${caller}`, 12)) ||
      !(await consumeQuota("help:global", 60))
    )
      return Response.json(
        { error: "Help limit reached. Try again after the next hour." },
        { status: 429 },
      );
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(110000),
    ]);
    const answer =
      config.mode === "docs"
        ? await documentHelp(
            guide,
            parsed.data.stepId,
            parsed.data.problem,
            parsed.data.fresh,
            createPublicFetcher(signal),
          )
        : await troubleshoot(
            guide,
            parsed.data.stepId,
            parsed.data.problem,
            parsed.data.fresh,
            new OpenAIAdapter(config, signal),
          );
    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      {
        error:
          "Help could not complete. Your conversation was not saved. Check the step sources or retry.",
      },
      { status: 500 },
    );
  }
}
