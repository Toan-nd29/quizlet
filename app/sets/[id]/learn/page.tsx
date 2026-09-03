import { LearnMode } from '@/components/learn-mode';

export default async function LearnPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LearnMode setId={id} />; }
