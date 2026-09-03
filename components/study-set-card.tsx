'use client';

import Link from 'next/link';
import { Clock3, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/lib/client-api';
import type { StudySetSummary } from '@/lib/types';

export function StudySetCard({ set, onDuplicate, onDelete }: { set: StudySetSummary; onDuplicate: () => void; onDelete: () => void }) {
  const progress = set.itemCount ? Math.round((set.masteredCount / set.itemCount) * 100) : 0;
  return <article className="group relative rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-violet-400/45 hover:shadow-[0_16px_40px_rgba(0,0,0,.16)]">
    <div className="mb-6 flex items-center justify-between"><span className="h-1.5 w-12 rounded-full bg-violet-400" /><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Mở menu ${set.title}`} />}><MoreHorizontal aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/sets/${set.id}/edit`} />}><Pencil />Chỉnh sửa</DropdownMenuItem><DropdownMenuItem onClick={onDuplicate}><Copy />Nhân bản</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 />Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    <Link href={`/sets/${set.id}`} className="block rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50"><h3 className="line-clamp-1 text-lg font-semibold tracking-tight">{set.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{set.description || 'Chưa có mô tả.'}</p><div className="mt-6 flex items-center justify-between text-xs text-muted-foreground"><span>{set.itemCount} câu hỏi</span><span>{progress}%</span></div><Progress value={progress} className="mt-2 [&_[data-slot=progress-indicator]]:bg-violet-400" /><div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{formatRelativeDate(set.lastStudiedAt ?? set.updatedAt)}</div></Link>
  </article>;
}
