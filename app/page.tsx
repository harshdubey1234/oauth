import { Shell } from '@/components/shell';
import { Library } from '@/components/library';
import { getLibrary } from '@/lib/store';
import { preparedGuides } from '@/lib/guides';
import { summarizeGuide } from '@/lib/library-summary';
export const dynamic = 'force-dynamic';
export default async function Home() {
  let guides = preparedGuides; let libraryError: string | undefined;
  try { guides = await getLibrary(); } catch { libraryError = 'Saved public guides are temporarily unavailable. The prepared guides remain accessible.'; }
  return <Shell><Library guides={guides.map(summarizeGuide)} libraryError={libraryError}/></Shell>;
}
