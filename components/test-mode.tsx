'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, FileText, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ModeNav } from '@/components/mode-nav';
import { api, shuffle } from '@/lib/client-api';
import type { StudySet } from '@/lib/types';
import type { TestQuestionData, TestResultData } from '@/lib/test-types';
import { optionLetter, resolveMcq, scoreAnswers } from '@/lib/study-algorithms';

export function TestMode({ setId }: { setId: string }) {
  const router = useRouter();
  const [set, setSet] = useState<StudySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState('10');
  const [multiple, setMultiple] = useState(true);
  const [written, setWritten] = useState(true);
  const [source, setSource] = useState<'all' | 'new' | 'wrong'>('all');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [questions, setQuestions] = useState<TestQuestionData[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [position, setPosition] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  const createQuestions = useCallback((data: StudySet, forcedIds?: string[]) => {
    let pool = forcedIds ? data.items.filter((item) => forcedIds.includes(item.id)) : data.items.filter((item) => source === 'all' || source === 'new' ? source === 'all' || item.progress.status !== 'MASTERED' : item.progress.incorrectCount > 0);
    if (!pool.length) return toast.add({ title: 'Không có câu hỏi phù hợp với nguồn đã chọn.', type: 'warning' });
    if (shuffleQuestions) pool = shuffle(pool);
    const limit = forcedIds ? pool.length : count === 'all' ? pool.length : Math.min(Number(count), pool.length);
    const selected = pool.slice(0, limit).map((item, index) => {
      const mcq = resolveMcq(item, data.items);
      let optionList = mcq.options.map((option) => option.content);
      const canMultiple = multiple && optionList.length >= 2;
      const type: 'multiple' | 'written' = canMultiple && (!written || index % 2 === 0) ? 'multiple' : 'written';
      if (shuffleAnswers) optionList = shuffle(optionList);
      return { itemId: item.id, question: mcq.prompt, answer: mcq.correctAnswer, explanation: item.explanation, type, options: type === 'multiple' ? optionList : [] };
    });
    setQuestions(selected); setAnswers({}); setPosition(0); startedAt.current = new Date().toISOString();
  }, [count, multiple, shuffleAnswers, shuffleQuestions, source, written]);
  const createQuestionsRef = useRef(createQuestions);
  useEffect(() => { createQuestionsRef.current = createQuestions; }, [createQuestions]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await api<StudySet>(`/api/sets/${setId}`); setSet(data); const retry = new URLSearchParams(window.location.search).get('retry') === '1'; if (retry) { const ids = JSON.parse(sessionStorage.getItem(`memostudy:retry:${setId}`) ?? '[]') as string[]; if (ids.length) createQuestionsRef.current(data, ids); } }
    catch (value) { setError(value instanceof Error ? value.message : 'Không thể tải bài kiểm tra.'); }
    finally { setLoading(false); }
  }, [setId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if (target.matches('input, textarea, select, [contenteditable="true"]')) return; const question = questions[position]; if (!question || question.type !== 'multiple' || !/^[1-4]$/.test(event.key)) return; const option = question.options[Number(event.key) - 1]; if (option) setAnswers((current) => ({ ...current, [question.itemId]: option })); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [position, questions]);

  const submit = async () => {
    if (!set) return;
    setSubmitting(true);
    try {
      const score = scoreAnswers(questions, answers);
      const results = questions.map((question) => ({ question, correct: score.details.find((detail) => detail.itemId === question.itemId)?.correct ?? false }));
      await Promise.all(results.map(({ question, correct }) => api('/api/progress', { method: 'POST', body: JSON.stringify({ studySetId: setId, studyItemId: question.itemId, action: correct ? 'correct' : 'incorrect' }) })));
      const correctAnswers = results.filter((result) => result.correct).length;
      await api('/api/sessions', { method: 'POST', body: JSON.stringify({ studySetId: setId, mode: 'TEST', startedAt: startedAt.current, correctAnswers, incorrectAnswers: questions.length - correctAnswers, totalAnswers: questions.length }) });
      const result: TestResultData = { setId, setTitle: set.title, completedAt: new Date().toISOString(), questions, answers };
      sessionStorage.setItem(`memostudy:test-result:${setId}`, JSON.stringify(result));
      router.push(`/sets/${setId}/test/result`);
    } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể nộp bài.', type: 'error' }); setSubmitOpen(false); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingState label="Đang chuẩn bị bài kiểm tra..." />;
  if (error || !set) return <ErrorState message={error || 'Không tìm thấy bộ học.'} onRetry={() => void load()} />;
  if (!set.items.length) return <main className="mx-auto max-w-3xl px-4 py-10"><ModeNav setId={setId} active="test" /><EmptyState title="Chưa có nội dung kiểm tra." description="Thêm câu hỏi trước khi tạo đề." action={<Button render={<Link href={`/sets/${setId}/edit`} />}>Thêm câu hỏi</Button>} /></main>;
  if (!questions.length) return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8"><div className="mb-5"><Link href={`/sets/${setId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{set.title}</Link></div><ModeNav setId={setId} active="test" /><section className="rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="mx-auto max-w-2xl text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><ClipboardCheck className="size-7" /></span><h1 className="mt-5 text-3xl font-bold">Tạo bài kiểm tra</h1><p className="mt-2 text-sm text-muted-foreground">Chọn cấu hình phù hợp rồi bắt đầu. Đáp án chỉ hiển thị sau khi nộp bài.</p></div><div className="mx-auto mt-8 max-w-2xl space-y-6"><div><p className="mb-3 text-sm font-semibold">Số câu</p><div className="grid grid-cols-4 gap-2">{['10', '20', '50', 'all'].map((value) => <button key={value} onClick={() => setCount(value)} className={`h-11 rounded-xl border text-sm font-semibold transition ${count === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}>{value === 'all' ? 'Tất cả' : value}</button>)}</div></div><div><p className="mb-3 text-sm font-semibold">Loại câu</p><div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border border-border p-4"><Checkbox checked={multiple} onCheckedChange={(value) => setMultiple(Boolean(value))} /><ListChecks className="size-4 text-violet-300" /><span className="text-sm">Trắc nghiệm</span></label><label className="flex items-center gap-3 rounded-xl border border-border p-4"><Checkbox checked={written} onCheckedChange={(value) => setWritten(Boolean(value))} /><FileText className="size-4 text-cyan-300" /><span className="text-sm">Tự luận</span></label></div></div><div><p className="mb-3 text-sm font-semibold">Nguồn câu hỏi</p><RadioGroup value={source} onValueChange={(value) => setSource((value ?? 'all') as typeof source)}><label className="flex items-center gap-3 rounded-xl border border-border p-3"><RadioGroupItem value="all" />Tất cả</label><label className="flex items-center gap-3 rounded-xl border border-border p-3"><RadioGroupItem value="new" />Câu chưa thuộc</label><label className="flex items-center gap-3 rounded-xl border border-border p-3"><RadioGroupItem value="wrong" />Câu từng trả lời sai</label></RadioGroup></div><div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"><Checkbox checked={shuffleQuestions} onCheckedChange={(value) => setShuffleQuestions(Boolean(value))} />Xáo trộn câu hỏi</label><label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"><Checkbox checked={shuffleAnswers} onCheckedChange={(value) => setShuffleAnswers(Boolean(value))} />Xáo trộn đáp án</label></div><Button className="h-12 w-full" disabled={!multiple && !written} onClick={() => createQuestions(set)}>Bắt đầu kiểm tra<ArrowRight /></Button>{!multiple && !written && <p className="text-center text-xs text-rose-300">Chọn ít nhất một loại câu hỏi.</p>}</div></section></main>;
  const current = questions[position];
  const answered = Object.keys(answers).length;
  return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8"><div className="mb-5 flex items-center justify-between"><Link href={`/sets/${setId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Thoát bài kiểm tra</Link><span className="text-sm text-muted-foreground">Đã trả lời {answered}/{questions.length}</span></div><ModeNav setId={setId} active="test" /><div className="mb-5"><div className="mb-2 flex justify-between text-sm"><span className="font-medium">Câu {position + 1} / {questions.length}</span><span className="text-muted-foreground">{Math.round(((position + 1) / questions.length) * 100)}%</span></div><Progress value={((position + 1) / questions.length) * 100} className="[&_[data-slot=progress-track]]:h-2" /></div><section className="rounded-3xl border border-border bg-card p-5 sm:p-8"><span className="text-xs font-bold uppercase tracking-[.12em] text-violet-300">{current.type === 'multiple' ? 'Trắc nghiệm' : 'Tự luận'}</span><h1 className="mt-5 whitespace-pre-wrap text-xl font-semibold leading-relaxed sm:text-2xl">{current.question}</h1>{current.type === 'multiple' ? <div className="mt-7 grid gap-3 sm:grid-cols-2">{current.options.map((option, index) => <button key={`${option}-${index}`} onClick={() => setAnswers((data) => ({ ...data, [current.itemId]: option }))} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left transition ${answers[current.itemId] === option ? 'border-primary bg-primary/12' : 'border-border hover:border-violet-400/50'}`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold">{optionLetter(index)}</span><span className="font-medium">{option}</span>{answers[current.itemId] === option && <Check className="ml-auto size-5 text-violet-300" />}</button>)}</div> : <Input value={answers[current.itemId] ?? ''} onChange={(event) => setAnswers((data) => ({ ...data, [current.itemId]: event.target.value }))} placeholder="Nhập câu trả lời..." className="mt-7 h-12" />}</section><div className="mt-5 flex items-center justify-center gap-3"><Button variant="outline" disabled={position === 0} onClick={() => setPosition((value) => value - 1)}><ArrowLeft />Trước</Button>{questions.length <= 24 && <div className="hidden flex-wrap justify-center gap-1 sm:flex">{questions.map((question, index) => <button key={question.itemId} aria-label={`Đến câu ${index + 1}`} onClick={() => setPosition(index)} className={`size-2 rounded-full ${index === position ? 'bg-primary' : answers[question.itemId] ? 'bg-emerald-400' : 'bg-muted'}`} />)}</div>}{position < questions.length - 1 ? <Button onClick={() => setPosition((value) => value + 1)}>Sau<ArrowRight /></Button> : <Button className="bg-emerald-500 hover:bg-emerald-400" onClick={() => setSubmitOpen(true)}><ClipboardCheck />Nộp bài</Button>}</div>
    <ConfirmDialog open={submitOpen} onOpenChange={setSubmitOpen} title="Nộp bài kiểm tra?" description={`${answered < questions.length ? `Bạn còn ${questions.length - answered} câu chưa trả lời. ` : ''}Sau khi nộp, đáp án và điểm số sẽ được hiển thị.`} confirmLabel="Nộp bài" loading={submitting} onConfirm={submit} />
  </main>;
}
