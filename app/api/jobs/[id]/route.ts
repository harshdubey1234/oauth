import { getJob, updateJob } from '@/lib/store';
export async function GET(_request: Request, { params }: { params: Promise<{id: string}> }) {
  const {id} = await params; if (!/^[a-f0-9-]{36}$/.test(id)) return Response.json({error:'Invalid request.'}, {status:400});
  const job = await getJob(id); if (!job) return Response.json({error:'Research not found.'}, {status:404});
  if (job.status === 'running' && Date.now() - Date.parse(job.updated_at) > 270000) {
    await updateJob(id, JSON.parse(job.events), 'interrupted', null, 'The request ended before research completed. Retry with your original input.');
    job.status = 'interrupted'; job.error = 'The request ended before research completed. Retry with your original input.';
  }
  return Response.json({status:job.status,events:JSON.parse(job.events),url:job.guide_id ? `/guides/${job.guide_id}` : null,error:job.error}, {headers:{'Cache-Control':'no-store'}});
}
