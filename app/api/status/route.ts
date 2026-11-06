import { runtimeConfig } from "@/lib/config";
export function GET() {
  const config = runtimeConfig();
  return Response.json({
    researchConfigured: config.mode === "docs" || !!config.apiKey,
    mode: config.mode,
    message:
      config.mode === "docs"
        ? "Free live documentation research is ready. No model key or paid search API is required."
        : config.apiKey
          ? "Optional model-assisted research is configured."
          : "Optional model research needs a server key. Choose docs mode for free research.",
  });
}
