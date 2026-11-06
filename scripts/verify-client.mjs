import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
let files=0;
async function scan(dir){for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await scan(file);else if(/\.(js|html|css)$/.test(file)){files++;const content=await readFile(file,'utf8');if(/api\.openai\.com\/v1\/responses|Authorization.{0,12}Bearer.{0,12}apiKey/.test(content))throw new Error('Server adapter leaked into client output');if(/(?:sk-(?:proj-)?[a-zA-Z0-9_-]{30,}|art_v2_[a-zA-Z0-9_]{20,})/.test(content))throw new Error('Possible secret found in client output');}}}
await scan('dist/client');console.log(`PASS ${files} client assets checked; no server model adapter or credential patterns found.`);
