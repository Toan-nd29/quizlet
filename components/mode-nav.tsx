import Link from 'next/link';

export function ModeNav({ setId, active }: { setId: string; active: 'flashcards' | 'learn' | 'test' }) {
  return <nav aria-label="Chế độ học" className="mx-auto mb-6 flex w-fit rounded-xl border border-border bg-card p-1"><Link href={`/sets/${setId}/flashcards`} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active === 'flashcards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Flashcards</Link><Link href={`/sets/${setId}/learn`} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active === 'learn' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Học</Link><Link href={`/sets/${setId}/test`} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active === 'test' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Kiểm tra</Link></nav>;
}
