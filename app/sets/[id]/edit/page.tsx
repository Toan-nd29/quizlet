import { SetEditor } from '@/components/set-editor';

export default async function EditSetPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SetEditor setId={id} />; }
