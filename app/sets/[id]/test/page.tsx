import { TestMode } from '@/components/test-mode';

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <TestMode setId={id} />; }
