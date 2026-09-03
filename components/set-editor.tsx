'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileUp, LoaderCircle, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ErrorState, LoadingState } from '@/components/feedback';
import { EditorItem, StudyItemEditor } from '@/components/study-item-editor';
import { api, normalizeText } from '@/lib/client-api';
import type { StudySet } from '@/lib/types';

const emptyItem = (): EditorItem => ({ clientId: crypto.randomUUID(), question: '', answer: '', explanation: '', options: [] });

export function SetEditor({ setId }: { setId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<EditorItem[]>(() => [emptyItem()]);
  const [loading, setLoading] = useState(Boolean(setId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!setId) return;
    setLoading(true); setError('');
    try { const set = await api<StudySet>(`/api/sets/${setId}`); setTitle(set.title); setDescription(set.description); setItems(set.items.length ? set.items.map((item) => ({ clientId: crypto.randomUUID(), id: item.id, question: item.question, answer: item.answer, explanation: item.explanation, options: item.options })) : [emptyItem()]); setDirty(false); }
    catch (value) { setError(value instanceof Error ? value.message : 'Không thể tải bộ học.'); }
    finally { setLoading(false); }
  }, [setId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload); }, [dirty]);

  const changeItem = (index: number, item: EditorItem) => { setItems((current) => current.map((value, currentIndex) => currentIndex === index ? item : value)); setDirty(true); };
  const move = (index: number, direction: -1 | 1) => { setItems((current) => { const next = [...current]; const target = index + direction; [next[index], next[target]] = [next[target], next[index]]; return next; }); setDirty(true); };
  const duplicate = (index: number) => { setItems((current) => { const next = [...current]; const source = current[index]; next.splice(index + 1, 0, { ...source, id: undefined, clientId: crypto.randomUUID(), options: source.options.map((option) => ({ ...option, id: undefined })) }); return next; }); setDirty(true); };
  const add = () => { setItems((current) => [...current, emptyItem()]); setDirty(true); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50); };
  const remove = () => { if (deleteIndex === null) return; setItems((current) => current.filter((_, index) => index !== deleteIndex)); setDeleteIndex(null); setDirty(true); };

  const save = async () => {
    const usableItems = items.filter((item) => item.question.trim() || item.answer.trim());
    if (!title.trim()) return toast.add({ title: 'Vui lòng nhập tên bộ học.', type: 'warning' });
    const incomplete = usableItems.find((item) => !item.question.trim() || !item.answer.trim());
    if (incomplete) return toast.add({ title: 'Mỗi thẻ cần có cả câu hỏi và đáp án.', type: 'warning' });
    const keys = usableItems.map((item) => normalizeText(item.question.trim()));
    if (new Set(keys).size !== keys.length) return toast.add({ title: 'Có câu hỏi bị trùng lặp.', description: 'Hãy chỉnh sửa hoặc xóa câu hỏi trùng trước khi lưu.', type: 'warning' });
    const invalidOptions = usableItems.find((item) => item.options.length > 0 && (item.options.some((option) => !option.content.trim()) || item.options.filter((option) => option.isCorrect).length !== 1));
    if (invalidOptions) return toast.add({ title: 'Các lựa chọn trắc nghiệm chưa hợp lệ.', type: 'warning' });
    setSaving(true);
    try {
      const saved = await api<StudySet>(setId ? `/api/sets/${setId}` : '/api/sets', { method: setId ? 'PUT' : 'POST', body: JSON.stringify({ title, description, items: usableItems.map(({ clientId: _, ...item }) => item) }) });
      setDirty(false); toast.add({ title: 'Đã lưu thay đổi.', type: 'success' }); router.push(`/sets/${saved.id}`);
    } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể lưu thay đổi.', type: 'error' }); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingState label="Đang tải bộ học..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><Link href={setId ? `/sets/${setId}` : '/'} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Quay lại</Link><h1 className="text-3xl font-bold tracking-tight">{setId ? 'Chỉnh sửa bộ học' : 'Tạo bộ học mới'}</h1><p className="mt-2 text-sm text-muted-foreground">Mỗi câu hỏi và đáp án sẽ trở thành một thẻ học.</p></div><div className="flex gap-2">{setId && <Button variant="outline" render={<Link href={`/import?setId=${setId}`} />}><FileUp />Import thêm</Button>}<Button onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}{saving ? 'Đang lưu...' : 'Lưu bộ học'}</Button></div></div>
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6"><label className="block space-y-2"><span className="text-sm font-semibold">Tên bộ học</span><Input value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} placeholder="Ví dụ: Lịch sử Đảng" className="h-11 text-base" maxLength={160} /></label><label className="mt-4 block space-y-2"><span className="text-sm font-semibold">Mô tả</span><Textarea value={description} onChange={(event) => { setDescription(event.target.value); setDirty(true); }} placeholder="Mô tả ngắn nội dung bộ học..." className="min-h-24" maxLength={1000} /></label></section>
    <div className="space-y-4">{items.map((item, index) => <StudyItemEditor key={item.clientId} item={item} index={index} total={items.length} onChange={(value) => changeItem(index, value)} onDuplicate={() => duplicate(index)} onDelete={() => setDeleteIndex(index)} onMove={(direction) => move(index, direction)} />)}</div>
    {items.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Chưa có nội dung học.</div>}
    <Button type="button" variant="outline" className="mt-5 h-11 w-full border-dashed" onClick={add}><Plus />Thêm thẻ</Button>
    <div className="sticky bottom-4 mt-8 flex justify-end gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur"><Button variant="ghost" render={<Link href={setId ? `/sets/${setId}` : '/'} />}>Hủy</Button><Button onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}{saving ? 'Đang lưu...' : 'Lưu bộ học'}</Button></div>
    <ConfirmDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)} title="Xóa thẻ này?" description="Câu hỏi và tiến độ liên quan sẽ bị xóa. Hành động này không thể hoàn tác." confirmLabel="Xóa thẻ" destructive onConfirm={remove} />
  </main>;
}
