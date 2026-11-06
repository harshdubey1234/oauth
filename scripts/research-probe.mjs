// Bundles scripts/research-probe.ts for Node and runs it with the given provider names.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["scripts/research-probe.ts"],
  outfile: ".runtime/research-probe.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "error",
});
const r = spawnSync(process.execPath, [".runtime/research-probe.mjs", ...process.argv.slice(2)], { stdio: "inherit" });
process.exitCode = r.status ?? 1;
