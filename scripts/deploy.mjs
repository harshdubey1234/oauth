import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const profile = JSON.parse(readFileSync(".deployment/cloudflare.json", "utf8"));
if (!/^[a-f\d]{32}$/i.test(profile.accountId || ""))
  throw new Error("Configure your real Cloudflare account ID first.");
if (
  !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(
    profile.databaseId || "",
  ) ||
  /^0{8}-/.test(profile.databaseId)
)
  throw new Error("Configure the real D1 database ID first.");
if (!/^[a-z\d][a-z\d-]{0,62}$/.test(profile.workerName || ""))
  throw new Error("Configure a valid Worker name first.");

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("scripts/run-framework.mjs", ["build"]);
run("scripts/verify-client.mjs", []);
const wrangler = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
run(wrangler, [
  "d1",
  "migrations",
  "apply",
  "DB",
  "--remote",
  "--config",
  "dist/server/wrangler.json",
]);
if (existsSync(".deployment/import-guides.sql")) {
  run(wrangler, [
    "d1",
    "execute",
    "DB",
    "--remote",
    "--config",
    "dist/server/wrangler.json",
    "--file",
    ".deployment/import-guides.sql",
    "--yes",
  ]);
}
run(wrangler, ["deploy", "--config", "dist/server/wrangler.json"]);
