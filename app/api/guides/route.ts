import { getLibrary } from '@/lib/store';
import { summarizeGuide } from '@/lib/library-summary';
export async function GET() { return Response.json((await getLibrary()).map(summarizeGuide)); }
