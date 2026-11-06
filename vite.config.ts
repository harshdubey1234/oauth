import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import vinext from "vinext";

type Deployment = {
  accountId?: string;
  databaseId?: string;
  databaseName?: string;
  workerName?: string;
};

function deployment(): Deployment {
  try {
    return JSON.parse(readFileSync(".deployment/cloudflare.json", "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export default defineConfig(async () => {
  process.env.WRANGLER_SEND_METRICS ??= "false";
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  const profile = deployment();
  return {
    server: { host: "127.0.0.1", port: 5173 },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          name: profile.workerName || "oauth-atlas",
          main: "./worker/index.ts",
          compatibility_date: "2026-05-15",
          compatibility_flags: ["nodejs_compat"],
          workers_dev: true,
          preview_urls: false,
          ...(profile.accountId ? { account_id: profile.accountId } : {}),
          vars: { RESEARCH_MODE: "docs" },
          d1_databases: [
            {
              binding: "DB",
              database_name: profile.databaseName || "oauth-atlas",
              database_id:
                profile.databaseId || "00000000-0000-4000-8000-000000000000",
              migrations_dir: resolve("drizzle"),
            },
          ],
          observability: { enabled: true },
        },
      }),
    ],
  };
});
