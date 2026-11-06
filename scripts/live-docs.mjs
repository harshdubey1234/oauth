import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({entryPoints:['scripts/live-docs.ts'],outfile:'.runtime/live-docs.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const result=spawnSync(process.execPath,['.runtime/live-docs.mjs',...process.argv.slice(2)],{stdio:'inherit'});process.exitCode=result.status??1;
