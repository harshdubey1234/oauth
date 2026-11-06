import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
await mkdir('.runtime/tests', { recursive: true });
await build({ entryPoints: ['tests/core.test.ts'], outfile: '.runtime/tests/core.test.mjs', bundle: true, platform: 'node', format: 'esm',
  plugins: [{ name: 'test-d1', setup(b) { b.onResolve({filter:/^cloudflare:workers$/},()=>({path:path.resolve('tests/sqlite-d1.ts')})); } }],
});
const result = spawnSync(process.execPath, ['--test', '.runtime/tests/core.test.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
if(result.status===0){
  await build({entryPoints:['scripts/local-fixture.ts'],outfile:'.runtime/tests/local-fixture.mjs',bundle:true,platform:'node',format:'esm'});
  const fixture=spawnSync(process.execPath,['.runtime/tests/local-fixture.mjs'],{stdio:'inherit'});
  if(fixture.status!==0)process.exitCode=1;
}
