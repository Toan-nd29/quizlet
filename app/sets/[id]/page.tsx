import { SetDetail } from '@/components/set-detail';

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SetDetail setId={id} />; }
