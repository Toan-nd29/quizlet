'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, FileQuestion, Layers3, Pencil, Play, RotateCcw, Search, Shuffle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { QuestionEditorModal } from '@/components/question-editor-modal';
import { api, normalizeText } from '@/lib/client-api';
import type { StudyItem, StudySet } from '@/lib/types';

type Filter = 'ALL' | 'MASTERED' | 'LEARNING' | 'NEW' | 'INCORRECT';

export function SetDetail({ setId }: { setId: string }) {
  const [set, setSet] = useState<StudySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [sort, setSort] = useState('order');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<StudyItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudyItem | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const load = useCallback(async () => { setLoading(true); setError(''); try { setSet(await api<StudySet>(`/api/sets/${setId}`)); } catch (value) { setError(value instanceof Error ? value.message : 'Không thể tải bộ học.'); } finally { setLoading(false); } }, [setId]);
  useEffect(() => { void load(); }, [load]);
  const counts = useMemo(() => ({ mastered: set?.items.filter((item) => item.progress.status === 'MASTERED').length ?? 0, learning: set?.items.filter((item) => item.progress.status === 'LEARNING').length ?? 0, fresh: set?.items.filter((item) => item.progress.status === 'NEW').length ?? 0 }), [set]);
  const filtered = useMemo(() => {
    if (!set) return [];
    const key = normalizeText(query);
    const rows = set.items.filter((item) => (!key || normalizeText(`${item.question} ${item.answer}`).includes(key)) && (filter === 'ALL' || filter === 'INCORRECT' ? filter === 'ALL' || item.progress.incorrectCount > 0 : item.progress.status === filter));
    return [...rows].sort((a, b) => sort === 'alphabetical' ? a.question.localeCompare(b.question, 'vi') : sort === 'incorrect' ? b.progress.incorrectCount - a.progress.incorrectCount : a.order - b.order);
  }, [set, query, filter, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice((page - 1) * 20, page * 20);
  useEffect(() => { setPage(1); }, [query, filter, sort]);

  const saveWholeSet = async (items: StudyItem[]) => { if (!set) return; setSaving(true); try { const updated = await api<StudySet>(`/api/sets/${set.id}`, { method: 'PUT', body: JSON.stringify({ title: set.title, description: set.description, items: items.map((item) => ({ id: item.id, question: item.question, answer: item.answer, explanation: item.explanation, options: item.options })) }) }); setSet(updated); toast.add({ title: 'Đã lưu thay đổi.', type: 'success' }); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể lưu thay đổi.', type: 'error' }); throw value; } finally { setSaving(false); } };
  const saveEdited = async (item: StudyItem) => { if (!set) return; await saveWholeSet(set.items.map((current) => current.id === item.id ? item : current)); setEditing(null); };
  const duplicate = async (item: StudyItem) => { if (!set) return; const copy = { ...item, id: `new_${crypto.randomUUID()}`, options: item.options.map((option) => ({ ...option, id: undefined })) }; await saveWholeSet([...set.items, copy]); };
  const remove = async () => { if (!deleteTarget) return; try { await api(`/api/items/${deleteTarget.id}`, { method: 'DELETE' }); setSet((current) => current ? { ...current, items: current.items.filter((item) => item.id !== deleteTarget.id) } : current); toast.add({ title: 'Đã xóa câu hỏi.', type: 'success' }); setDeleteTarget(null); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể xóa câu hỏi.', type: 'error' }); } };
  const bulkDelete = async () => { try { await Promise.all([...selected].map((id) => api(`/api/items/${id}`, { method: 'DELETE' }))); setSet((current) => current ? { ...current, items: current.items.filter((item) => !selected.has(item.id)) } : current); toast.add({ title: `Đã xóa ${selected.size} câu hỏi.`, type: 'success' }); setSelected(new Set()); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể xóa các câu hỏi.', type: 'error' }); } };
  const bulkStatus = async (action: 'mastered' | 'new') => { if (!set) return; try { await Promise.all([...selected].map((studyItemId) => api('/api/progress', { method: 'POST', body: JSON.stringify({ studySetId: set.id, studyItemId, action }) }))); toast.add({ title: action === 'mastered' ? 'Đã đánh dấu đã thuộc.' : 'Đã chuyển về chưa học.', type: 'success' }); setSelected(new Set()); await load(); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể cập nhật trạng thái.', type: 'error' }); } };
  const bulkDuplicate = async () => { if (!set) return; const copies = set.items.filter((item) => selected.has(item.id)).map((item) => ({ ...item, id: `new_${crypto.randomUUID()}`, options: item.options.map((option) => ({ ...option, id: undefined })) })); await saveWholeSet([...set.items, ...copies]); setSelected(new Set()); };
  const reset = async () => { try { await api(`/api/sets/${setId}/reset`, { method: 'POST' }); setResetOpen(false); toast.add({ title: 'Đã đặt lại tiến độ.', type: 'success' }); await load(); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể đặt lại tiến độ.', type: 'error' }); } };

  if (loading) return <LoadingState label="Đang mở bộ học..." />;
  if (error || !set) return <ErrorState message={error || 'Không tìm thấy bộ học.'} onRetry={() => void load()} />;
  const percent = set.items.length ? Math.round((counts.mastered / set.items.length) * 100) : 0;
  return <main className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10">
    <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Thư viện</Link>
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start"><div className="max-w-2xl"><p className="text-sm font-semibold text-violet-300">{set.items.length} thuật ngữ / câu hỏi</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{set.title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{set.description || 'Chưa có mô tả cho bộ học này.'}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" render={<Link href={`/sets/${set.id}/edit`} />}><Pencil />Chỉnh sửa</Button><Button variant="outline" onClick={() => setResetOpen(true)}><RotateCcw />Đặt lại</Button></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><Link href={`/sets/${set.id}/flashcards`} className="group rounded-2xl border border-border bg-background/35 p-4 transition hover:border-violet-400/50"><Layers3 className="size-5 text-violet-300" /><p className="mt-3 font-semibold">Flashcards</p><p className="mt-1 text-xs text-muted-foreground">Lật thẻ và tự đánh giá</p></Link><Link href={`/sets/${set.id}/learn`} className="group rounded-2xl border border-border bg-background/35 p-4 transition hover:border-cyan-400/50"><Play className="size-5 text-cyan-300" /><p className="mt-3 font-semibold">Học</p><p className="mt-1 text-xs text-muted-foreground">Lặp lại câu chưa thuộc</p></Link><Link href={`/sets/${set.id}/test`} className="group rounded-2xl border border-border bg-background/35 p-4 transition hover:border-emerald-400/50"><FileQuestion className="size-5 text-emerald-300" /><p className="mt-3 font-semibold">Kiểm tra</p><p className="mt-1 text-xs text-muted-foreground">Tạo đề và chấm điểm</p></Link></div>
      <div className="mt-7"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">Tiến độ tổng thể</span><span className="text-muted-foreground">{counts.mastered} / {set.items.length} đã thuộc</span></div><Progress value={percent} className="[&_[data-slot=progress-track]]:h-2" /><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-emerald-400/8 p-3"><strong className="block text-lg text-emerald-300">{counts.mastered}</strong>Đã thuộc</div><div className="rounded-xl bg-amber-400/8 p-3"><strong className="block text-lg text-amber-300">{counts.learning}</strong>Đang học</div><div className="rounded-xl bg-slate-400/8 p-3"><strong className="block text-lg text-slate-300">{counts.fresh}</strong>Chưa học</div></div></div>
    </section>
    <section className="mt-8"><div className="mb-4 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm trong ${set.items.length} câu...`} className="h-10 pl-10" /></label><div className="grid grid-cols-2 gap-2 sm:flex"><Select value={filter} onValueChange={(value) => setFilter((value ?? 'ALL') as Filter)} items={{ ALL: 'Tất cả', MASTERED: 'Đã thuộc', LEARNING: 'Đang học', NEW: 'Chưa học', INCORRECT: 'Câu sai' }}><SelectTrigger className="h-10 w-full sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả</SelectItem><SelectItem value="MASTERED">Đã thuộc</SelectItem><SelectItem value="LEARNING">Đang học</SelectItem><SelectItem value="NEW">Chưa học</SelectItem><SelectItem value="INCORRECT">Câu sai</SelectItem></SelectContent></Select><Select value={sort} onValueChange={(value) => setSort(value ?? 'order')} items={{ order: 'Thứ tự', alphabetical: 'A–Z', incorrect: 'Sai nhiều nhất' }}><SelectTrigger className="h-10 w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="order">Thứ tự</SelectItem><SelectItem value="alphabetical">A–Z</SelectItem><SelectItem value="incorrect">Sai nhiều nhất</SelectItem></SelectContent></Select><Button variant="outline" render={<Link href={`/sets/${set.id}/flashcards?shuffle=1`} />} className="hidden sm:inline-flex"><Shuffle />Xáo trộn</Button></div></div>
      {selected.size > 0 && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 p-3"><span className="mr-auto text-sm font-medium">Đã chọn {selected.size} câu</span><Button size="sm" variant="outline" onClick={() => void bulkDuplicate()}><Copy />Nhân bản</Button><Button size="sm" variant="outline" onClick={() => void bulkStatus('mastered')}><CheckCircle2 />Đã thuộc</Button><Button size="sm" variant="outline" onClick={() => void bulkStatus('new')}><RotateCcw />Chưa học</Button><Button size="sm" variant="destructive" onClick={() => void bulkDelete()}><Trash2 />Xóa</Button></div>}
      {filtered.length === 0 ? <EmptyState title="Không có câu hỏi phù hợp." description={set.items.length ? 'Hãy thay đổi từ khóa hoặc bộ lọc.' : 'Thêm câu hỏi hoặc import dữ liệu để bắt đầu học.'} action={!set.items.length && <Button render={<Link href={`/sets/${set.id}/edit`} />}><Pencil />Thêm câu hỏi</Button>} /> : <div className="space-y-3">{visible.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex gap-3"><Checkbox checked={selected.has(item.id)} onCheckedChange={(checked) => setSelected((current) => { const next = new Set(current); if (checked) next.add(item.id); else next.delete(item.id); return next; })} aria-label={`Chọn câu ${item.order + 1}`} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-violet-300">#{item.order + 1}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.progress.status === 'MASTERED' ? 'bg-emerald-400/10 text-emerald-300' : item.progress.status === 'LEARNING' ? 'bg-amber-400/10 text-amber-300' : 'bg-muted text-muted-foreground'}`}>{item.progress.status === 'MASTERED' ? 'Đã thuộc' : item.progress.status === 'LEARNING' ? 'Đang học' : 'Chưa học'}</span>{item.progress.incorrectCount > 0 && <span className="text-[11px] text-rose-300">Sai {item.progress.incorrectCount} lần</span>}</div><p className="mt-2 font-medium leading-6">{item.question}</p><p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground/75">Đáp án:</span> {item.answer}</p></div><div className="flex shrink-0 items-start gap-1"><Button variant="ghost" size="icon-sm" aria-label="Chỉnh sửa" onClick={() => setEditing(item)}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label="Nhân bản" onClick={() => void duplicate(item)}><Copy /></Button><Button variant="destructive" size="icon-sm" aria-label="Xóa" onClick={() => setDeleteTarget(item)}><Trash2 /></Button></div></div></article>)}</div>}
      {pageCount > 1 && <nav aria-label="Phân trang" className="mt-5 flex items-center justify-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Trước</Button><span className="text-sm text-muted-foreground">Trang {page} / {pageCount}</span><Button variant="outline" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Sau</Button></nav>}
    </section>
    <QuestionEditorModal item={editing} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} onSave={saveEdited} saving={saving} />
    <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Xóa câu hỏi?" description="Câu hỏi và tiến độ liên quan sẽ bị xóa. Hành động này không thể hoàn tác." confirmLabel="Xóa câu hỏi" destructive onConfirm={remove} />
    <ConfirmDialog open={resetOpen} onOpenChange={setResetOpen} title="Đặt lại tiến độ?" description="Toàn bộ trạng thái đã thuộc, đang học và số lần đúng/sai của bộ này sẽ được xóa." confirmLabel="Đặt lại" destructive onConfirm={reset} />
  </main>;
}
