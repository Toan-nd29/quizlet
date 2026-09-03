'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { StudySetCard } from '@/components/study-set-card';
import { api } from '@/lib/client-api';
import type { StudySet, StudySetSummary } from '@/lib/types';

export function HomeClient() {
  const [sets, setSets] = useState<StudySetSummary[]>([]);
  const [sort, setSort] = useState('updated');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StudySetSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(new URLSearchParams(window.location.search).get('q') ?? ''); }, []);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setSets(await api<StudySetSummary[]>(`/api/sets?q=${encodeURIComponent(query)}&sort=${sort}`)); } catch (value) { setError(value instanceof Error ? value.message : 'Không thể tải bộ học.'); } finally { setLoading(false); } }, [query, sort]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const reload = () => void load(); window.addEventListener('memostudy:data-changed', reload); return () => window.removeEventListener('memostudy:data-changed', reload); }, [load]);
  const recent = useMemo(() => sets.filter((set) => set.lastStudiedAt).slice(0, 3), [sets]);

  const duplicate = async (set: StudySetSummary) => { try { await api<StudySet>(`/api/sets/${set.id}/duplicate`, { method: 'POST' }); toast.add({ title: 'Đã nhân bản bộ học.', type: 'success' }); await load(); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể nhân bản.', type: 'error' }); } };
  const remove = async () => { if (!deleteTarget) return; setDeleting(true); try { await api(`/api/sets/${deleteTarget.id}`, { method: 'DELETE' }); toast.add({ title: 'Đã xóa bộ học.', type: 'success' }); setDeleteTarget(null); await load(); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể xóa bộ học.', type: 'error' }); } finally { setDeleting(false); } };

  if (loading) return <LoadingState label="Đang tải thư viện..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  return <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-12">
    <section className="mb-10 overflow-hidden rounded-3xl border border-violet-400/20 bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,.18)] sm:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-2xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200"><Sparkles className="size-3.5" />Học đúng trọng tâm</div><h1 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{query ? `Kết quả cho “${query}”` : 'Hôm nay bạn muốn học gì?'}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Tạo bộ thẻ, luyện câu chưa thuộc và theo dõi tiến độ trong một không gian tập trung.</p></div>{sets[0] && <Link href={`/sets/${recent[0]?.id ?? sets[0].id}/flashcards`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 font-semibold text-white transition hover:bg-violet-400">Tiếp tục học<ChevronRight className="size-4" /></Link>}</div></section>
    {sets.length === 0 ? <EmptyState title={query ? 'Không tìm thấy bộ học phù hợp.' : 'Bạn chưa có bộ học nào.'} description={query ? 'Thử tìm bằng từ khóa khác hoặc quay lại thư viện.' : 'Tạo bộ học đầu tiên hoặc import nội dung có sẵn để bắt đầu.'} action={<Button render={<Link href={query ? '/' : '/sets/new'} />}><Plus />{query ? 'Xem tất cả bộ học' : 'Tạo bộ học đầu tiên'}</Button>} /> : <section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-violet-300">{recent.length ? 'Tiếp tục học' : 'Thư viện của bạn'}</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Bộ học của tôi</h2></div><Select value={sort} onValueChange={(value) => setSort(value ?? 'updated')} items={{ updated: 'Cập nhật gần nhất', newest: 'Mới nhất', oldest: 'Cũ nhất', name: 'Tên A–Z' }}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="updated">Cập nhật gần nhất</SelectItem><SelectItem value="newest">Mới nhất</SelectItem><SelectItem value="oldest">Cũ nhất</SelectItem><SelectItem value="name">Tên A–Z</SelectItem></SelectContent></Select></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sets.map((set) => <StudySetCard key={set.id} set={set} onDuplicate={() => void duplicate(set)} onDelete={() => setDeleteTarget(set)} />)}</div></section>}
    <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Xóa bộ học?" description="Bạn có chắc muốn xóa bộ học này? Hành động này không thể hoàn tác." confirmLabel="Xóa bộ học" destructive loading={deleting} onConfirm={remove} />
  </main>;
}
