import { FlashcardMode } from '@/components/flashcard-mode';

export default async function FlashcardsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <FlashcardMode setId={id} />; }
