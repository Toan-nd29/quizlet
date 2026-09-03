'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { StudyItem, StudyOption } from '@/lib/types';

export function QuestionEditorModal({ item, open, onOpenChange, onSave, saving }: { item: StudyItem | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (item: StudyItem) => void | Promise<void>; saving: boolean }) {
  const [draft, setDraft] = useState<StudyItem | null>(item);
  useEffect(() => { setDraft(item ? { ...item, options: item.options.map((option) => ({ ...option })) } : null); }, [item]);
  if (!draft) return null;
  const updateOption = (index: number, patch: Partial<StudyOption>) => setDraft({ ...draft, options: draft.options.map((option, current) => current === index ? { ...option, ...patch } : patch.isCorrect ? { ...option, isCorrect: false } : option) });
  const validateAndSave = () => {
    if (!draft.question.trim() || !draft.answer.trim()) return toast.add({ title: 'Câu hỏi và đáp án không được để trống.', type: 'warning' });
    if (draft.options.length && (draft.options.some((option) => !option.content.trim()) || draft.options.filter((option) => option.isCorrect).length !== 1)) return toast.add({ title: 'Lựa chọn trắc nghiệm chưa hợp lệ.', type: 'warning' });
    void onSave(draft);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Chỉnh sửa câu hỏi</DialogTitle><DialogDescription>Thay đổi sẽ được cập nhật ngay trong bộ học.</DialogDescription></DialogHeader><div className="space-y-4"><label className="block space-y-2"><span className="text-sm font-semibold">Câu hỏi</span><Textarea value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} className="min-h-24" /></label><label className="block space-y-2"><span className="text-sm font-semibold">Đáp án</span><Textarea value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} className="min-h-20" /></label><label className="block space-y-2"><span className="text-sm font-semibold">Giải thích</span><Textarea value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} className="min-h-20" /></label><div><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">Loại câu hỏi</span>{draft.options.length === 0 ? <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, options: Array.from({ length: 4 }, (_, order) => ({ content: '', isCorrect: order === 0, order })) })}><Plus />Trắc nghiệm</Button> : <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, options: [] })}><X />Chỉ Flashcard</Button>}</div>{draft.options.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{draft.options.map((option, index) => <div key={index} className="flex items-center gap-2 rounded-xl border border-border p-2"><input type="radio" name="correct-option" checked={option.isCorrect} onChange={() => updateOption(index, { isCorrect: true })} className="size-4 accent-violet-500" aria-label={`Chọn đáp án ${index + 1} là đúng`} /><input value={option.content} onChange={(event) => updateOption(index, { content: event.target.value })} placeholder={`Đáp án ${String.fromCharCode(65 + index)}`} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>)}</div>}</div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Hủy</Button><Button onClick={validateAndSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></DialogFooter></DialogContent></Dialog>;
}
