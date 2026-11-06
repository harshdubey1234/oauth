declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    RESEARCH_MODE?: string;
    RESEARCH_MAX_PAGES?: string;
    RESEARCH_TIMEOUT_MS?: string;
    RESEARCH_MAX_SEARCH_CALLS?: string;
    RESEARCH_MAX_SOURCES?: string;
    RESEARCH_MAX_OUTPUT_TOKENS?: string;
  }
}
