// Bundles and runs scripts/directory-sweep.ts. Optional args: app names to limit the sweep.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["scripts/directory-sweep.ts"],
  outfile: ".runtime/directory-sweep.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "error",
});
const r = spawnSync(process.execPath, [".runtime/directory-sweep.mjs", ...process.argv.slice(2)], { stdio: "inherit" });
process.exitCode = r.status ?? 1;
