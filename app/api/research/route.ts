import { researchInputSchema } from "@/lib/schema";
import {
  checkOrigin,
  containsSecret,
  digest,
  readJson,
  validateProviderInput,
} from "@/lib/security";
import { OpenAIAdapter, researchGuide } from "@/lib/research";
import { runtimeConfig } from "@/lib/config";
import { researchDocuments } from "@/lib/docs-agent";
import { createPublicFetcher } from "@/lib/public-fetch";
import {
  consumeQuota,
  getJob,
  startJob,
  updateJob,
  saveGuide,
  type ProgressEvent,
} from "@/lib/store";

export async function POST(request: Request) {
  try {
    // Consume the bounded body before early origin rejection. Workerd local HTTP
    // keep-alive connections can otherwise carry an unread POST body forward.
    const body = await readJson(request);
    checkOrigin(request);
    const parsed = researchInputSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Enter an app name (2–160 characters) and a scenario under 600 characters.",
        },
        { status: 400 },
      );
    const input = parsed.data;
    validateProviderInput(input.provider);
    if (containsSecret(JSON.stringify(input)))
      return Response.json(
        { error: "Remove credentials or tokens before continuing." },
        { status: 400 },
      );
    const config = runtimeConfig();
    if (config.mode === "openai" && !config.apiKey)
      return Response.json(
        {
          error:
            "Optional model research is not configured. Choose docs mode for free live research.",
          code: "configuration_required",
        },
        { status: 503 },
      );
    const jobId = request.headers.get("idempotency-key");
    if (!jobId || !/^[a-f0-9-]{36}$/.test(jobId))
      return Response.json(
        { error: "A valid request identifier is required." },
        { status: 400 },
      );
    const inputHash = await digest(JSON.stringify(input));
    const existing = await getJob(jobId);
    if (existing) {
      if (existing.input_hash !== inputHash)
        return Response.json(
          { error: "This request identifier belongs to a different scenario." },
          { status: 409 },
        );
      return Response.json(
        {
          jobId,
          status: existing.status,
          url: existing.guide_id ? `/guides/${existing.guide_id}` : null,
          error: existing.error,
        },
        { status: existing.guide_id ? 200 : 409 },
      );
    }
    const caller = await digest(
      request.headers.get("oai-authenticated-user-id") ||
        request.headers.get("cf-connecting-ip") ||
        "local-preview",
    );
    if (
      !(await consumeQuota(
        `research:${config.mode}:${caller}`,
        config.mode === "docs" ? 12 : 6,
      )) ||
      !(await consumeQuota(
        `research:${config.mode}:global`,
        config.mode === "docs" ? 60 : 30,
      ))
    )
      return Response.json(
        { error: "Research limit reached. Try again after the next hour." },
        { status: 429 },
      );
    if (!(await startJob(jobId, inputHash)))
      return Response.json(
        { error: "This research request is already running.", jobId },
        { status: 409 },
      );
    const encoder = new TextEncoder();
    const events: ProgressEvent[] = [];
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 240000);
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    const stream = new ReadableStream({
      async start(out) {
        let closed = false;
        const send = (event: string, data: unknown) => {
          if (!closed) {
            try {
              out.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                ),
              );
            } catch {
              closed = true;
              controller.abort();
            }
          }
        };
        const emit = async (stage: string, detail: string) => {
          events.push({ stage, detail, at: new Date().toISOString() });
          await updateJob(jobId, events, "running");
          send("progress", events.at(-1));
        };
        try {
          send("job", { jobId });
          const guide =
            config.mode === "docs"
              ? await researchDocuments(
                  input,
                  emit,
                  config,
                  createPublicFetcher(controller.signal),
                )
              : await researchGuide(
                  input,
                  new OpenAIAdapter(config, controller.signal),
                  emit,
                  config,
                );
          if (controller.signal.aborted)
            throw new Error("RESEARCH_INTERRUPTED");
          await emit(
            "saving",
            "Saving the guide and source evidence to durable storage.",
          );
          await saveGuide(guide);
          await updateJob(jobId, events, guide.researchStatus, guide.id);
          send("done", {
            url: `/guides/${guide.id}`,
            status: guide.researchStatus,
          });
        } catch {
          const message = controller.signal.aborted
            ? "Research was interrupted or timed out. Retry with your original input."
            : "Research could not complete. No successful setup is implied. Retry or use an official provider website.";
          await updateJob(jobId, events, "failed", null, message).catch(
            () => undefined,
          );
          send("error", { error: message });
        } finally {
          clearTimeout(deadline);
          request.signal.removeEventListener("abort", abort);
          if (!closed) {
            closed = true;
            out.close();
          }
        }
      },
      cancel() {
        controller.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const known =
      error instanceof Error &&
      /public HTTP|same-origin|JSON input|Request|app name|query strings|credentials|ports/.test(
        error.message,
      );
    return Response.json(
      {
        error: known
          ? (error as Error).message
          : "The request could not be accepted. Check the input and try again.",
      },
      { status: known ? 400 : 500 },
    );
  }
}
