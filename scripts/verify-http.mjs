import assert from 'node:assert/strict';
const base=process.env.ATLAS_VERIFY_URL||'http://127.0.0.1:5173';
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;console.log(`PASS ${message}`);};
const home=await fetch(base);const html=await home.text();check(home.status===200&&html.includes('before you write a line.')&&html.includes('ax-brand'),'Library SSR renders');
for(const id of ['github','slack','gmail','tally']){const r=await fetch(`${base}/guides/${id}`);const text=await r.text();check(r.status===200&&text.includes('YOUR NEXT ACTION'),'Guide SSR renders: '+id);const data=await fetch(`${base}/api/guides/${id}`).then(r=>r.json());check(data.sources.every(s=>s.url.startsWith('https://')),'Guide has source records: '+id);}
const library=await fetch(`${base}/api/guides`).then(r=>r.json());check(library.length===4&&['github','slack','gmail','tally'].every(id=>library.some(g=>g.id===id)),'Only prepared/public guides appear in library');
const configuration=await fetch(`${base}/api/status`).then(r=>r.json());check(typeof configuration.researchConfigured==='boolean','Configuration state is explicit');
const post=async(provider,origin=base)=>fetch(`${base}/api/research`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({provider,scenario:{actions:'Read selected pages',audience:'organization',stage:'test',ownership:'unsure'}})});
const statusOf=async(pending)=>{const r=await pending;await r.arrayBuffer();return r.status;};
check(await statusOf(post('http://169.254.169.254'))===400,'Metadata URL rejected');
check([400,403].includes(await statusOf(post('Notion','https://wrong-origin.com'))),'Cross-origin generation rejected');
if(!configuration.researchConfigured){const r=await post('Notion');const data=await r.json();check(r.status===503&&data.code==='configuration_required','Unfamiliar provider gets honest missing-key response');}
const help=await fetch(`${base}/api/guides/github/help`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({stepId:'install',problem:'A redacted error says repository access is missing',fresh:false})});
if(!configuration.researchConfigured)check(help.status===503,'Step-specific help has honest missing-key response');
else if(configuration.mode==='docs'){const answer=await help.json();check(help.status===200&&answer.hypothesis.startsWith('Hypothesis:')&&answer.sourceUrls.length>0,'Free step-specific help returns a source-backed diagnostic');}
check((await fetch(`${base}/guides/does-not-exist`)).status===404,'Missing shared guide returns 404');
const fixture='e7b8b546-14b2-44bb-9472-75da762029c6';
for(let session=0;session<2;session++){const r=await fetch(`${base}/api/guides/${fixture}`,{headers:{'Cache-Control':'no-cache'}});const g=await r.json();check(r.status===200&&g.title==='Local persistence verification fixture',`Unlisted fixture opens without cookies, session ${session+1}`);}
check((await fetch(`${base}/guides/${fixture}`)).status===200,'Opaque shared fixture page renders');
console.log(`${checks} HTTP checks passed. Model execution was ${configuration.researchConfigured?'not exercised by this script':'unconfigured'}.`);
