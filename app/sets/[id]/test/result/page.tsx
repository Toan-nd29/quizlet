import { TestResult } from '@/components/test-result';

export default async function TestResultPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <TestResult setId={id} />; }
