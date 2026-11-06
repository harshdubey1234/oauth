import { notFound } from 'next/navigation';
import { Shell } from '@/components/shell';
import { GuideReader } from '@/components/guide-reader';
import { getGuide } from '@/lib/store';
import { preparedGuideIds } from '@/lib/guides';
export const dynamic = 'force-dynamic';
export default async function GuidePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const guide=await getGuide(id); if(!guide)notFound();
  return <Shell current={guide.provider.name}><GuideReader guide={guide} prepared={preparedGuideIds.has(guide.id)}/></Shell>;
}
