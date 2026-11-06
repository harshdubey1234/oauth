import { getGuide } from '@/lib/store';
export async function GET(_request: Request, { params }: { params: Promise<{id: string}> }) {
  const { id } = await params; const guide = await getGuide(id);
  return guide ? Response.json(guide) : Response.json({ error: 'Guide not found.' }, { status: 404 });
}
