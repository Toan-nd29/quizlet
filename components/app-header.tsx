'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useState } from 'react';
import { BarChart3, BookOpenText, FileUp, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function AppHeader() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const search = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(123,108,255,.24)]"><BookOpenText className="size-5" aria-hidden="true" /></span>
          <span className="hidden text-lg sm:inline">MemoStudy</span>
        </Link>
        <form onSubmit={search} className="relative mx-auto w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Tìm bộ học" placeholder="Tìm bộ học..." className="h-10 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
        </form>
        <Link href="/statistics" aria-label="Thống kê" className="hidden size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground sm:grid"><BarChart3 className="size-4" aria-hidden="true" /></Link>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="lg" className="h-10 rounded-xl px-3.5" />}><Plus aria-hidden="true" /><span className="hidden sm:inline">Tạo mới</span></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem render={<Link href="/sets/new" />}><BookOpenText aria-hidden="true" />Tạo bộ Flashcard</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/import" />}><FileUp aria-hidden="true" />Import nội dung</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button aria-label="Tài khoản" className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-bold text-violet-200">MV</button>
      </div>
    </header>
  );
}
