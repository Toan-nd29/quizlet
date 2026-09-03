'use client';

import Link from 'next/link';
import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ModeNav } from '@/components/mode-nav';
import { api, normalizeText } from '@/lib/client-api';
import { isAnswerCorrect, optionLetter, repeatInsertIndex, resolveMcq, type Mcq } from '@/lib/study-algorithms';
import type { StudyItem, StudySet } from '@/lib/types';

type Feedback = { correct: boolean; selected: string; correctAnswer: string; progress: StudyItem['progress'] };
const NO_OPTIONS: Mcq['options'] = [];

// Học theo đúng thứ tự #1 → hết, thay vì ưu tiên xáo theo độ khó. Câu trả lời sai vẫn được chèn lại
// sau vài câu (xem repeatInsertIndex trong lib/study-algorithms) — chỉ thứ tự bắt đầu là tuần tự.
function byOrder(items: StudyItem[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

// Vị trí đang học được lưu trong localStorage của từng bộ, để thoát ra rồi vào lại vẫn tiếp tục đúng
// câu đang dở (tiến độ đúng/sai của từng câu thì luôn nằm trong database, đây chỉ là chỗ dừng).
type SavedSession = { queue: string[]; position: number; seen: string[]; wrongIds: string[]; correctAnswers: number; incorrectAnswers: number; firstTryCorrect: number; startedAt: string };
const sessionKey = (setId: string) => `memostudy:learn-session:${setId}`;

function readSession(setId: string, items: StudyItem[]): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(sessionKey(setId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSession;
    const known = new Set(items.map((item) => item.id));
    const queue = Array.isArray(saved.queue) ? saved.queue.filter((id) => known.has(id)) : [];
    if (!queue.length || typeof saved.position !== 'number' || saved.position < 0 || saved.position >= queue.length) return null;
    return { ...saved, queue, seen: (saved.seen ?? []).filter((id) => known.has(id)), wrongIds: (saved.wrongIds ?? []).filter((id) => known.has(id)) };
  } catch { return null; }
}

function writeSession(setId: string, saved: SavedSession) {
  try { window.localStorage.setItem(sessionKey(setId), JSON.stringify(saved)); } catch { /* private mode / storage disabled */ }
}

function clearSession(setId: string) {
  try { window.localStorage.removeItem(sessionKey(setId)); } catch { /* ignore */ }
}

export function LearnMode({ setId }: { setId: string }) {
  const [set, setSet] = useState<StudySet | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [written, setWritten] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const startedAt = useRef(new Date().toISOString());

  const current = useMemo(() => set?.items.find((item) => item.id === queue[position]) ?? null, [position, queue, set]);
  // The prompt/answer/options are resolved once per question (keyed by item id) and cached here, so a
  // later `set` update (e.g. saving progress after answering) never reshuffles or reorders the options
  // the user is currently looking at. resolveMcq also recovers real A–D choices that got pasted straight
  // into the question/answer text (instead of structured options), rather than showing unrelated answers.
  const [mcqCache, setMcqCache] = useState<{ id: string | null; mcq: Mcq | null }>({ id: null, mcq: null });
  if ((current?.id ?? null) !== mcqCache.id) {
    setMcqCache({ id: current?.id ?? null, mcq: current && set ? resolveMcq(current, set.items) : null });
  }
  const options = mcqCache.mcq?.options ?? NO_OPTIONS;
  const prompt = mcqCache.mcq?.prompt ?? current?.question ?? '';
  const correctAnswer = mcqCache.mcq?.correctAnswer ?? current?.answer ?? '';
  const start = useCallback((data: StudySet, itemIds?: string[]) => { const candidates = itemIds ? data.items.filter((item) => itemIds.includes(item.id)) : byOrder(data.items.filter((item) => item.progress.status !== 'MASTERED')); const selected = candidates.length ? candidates : byOrder(data.items); setQueue(selected.map((item) => item.id)); setPosition(0); setFeedback(null); setWritten(''); setFinished(false); setCorrectAnswers(0); setIncorrectAnswers(0); setFirstTryCorrect(0); setSeen(new Set()); setWrongIds(new Set()); startedAt.current = new Date().toISOString(); }, []);
  // Học lại từ đầu: đi lại toàn bộ bộ học từ câu #1, kể cả những câu đã thuộc.
  const restart = useCallback((data: StudySet) => { clearSession(setId); setQueue(byOrder(data.items).map((item) => item.id)); setPosition(0); setFeedback(null); setWritten(''); setFinished(false); setCorrectAnswers(0); setIncorrectAnswers(0); setFirstTryCorrect(0); setSeen(new Set()); setWrongIds(new Set()); startedAt.current = new Date().toISOString(); }, [setId]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api<StudySet>(`/api/sets/${setId}`);
      setSet(data);
      const saved = readSession(setId, data.items);
      if (saved) {
        setQueue(saved.queue); setPosition(saved.position); setSeen(new Set(saved.seen)); setWrongIds(new Set(saved.wrongIds));
        setCorrectAnswers(saved.correctAnswers ?? 0); setIncorrectAnswers(saved.incorrectAnswers ?? 0); setFirstTryCorrect(saved.firstTryCorrect ?? 0);
        setFeedback(null); setWritten(''); setFinished(false);
        startedAt.current = saved.startedAt ?? new Date().toISOString();
      } else start(data);
    } catch (value) { setError(value instanceof Error ? value.message : 'Không thể tải chế độ học.'); }
    finally { setLoading(false); }
  }, [setId, start]);
  useEffect(() => { void load(); }, [load]);
  // Ghi lại chỗ đang dừng sau mỗi thay đổi, để lần sau vào học tiếp đúng câu đó.
  useEffect(() => {
    if (loading || finished || !queue.length) return;
    writeSession(setId, { queue, position, seen: [...seen], wrongIds: [...wrongIds], correctAnswers, incorrectAnswers, firstTryCorrect, startedAt: startedAt.current });
  }, [loading, finished, queue, position, seen, wrongIds, correctAnswers, incorrectAnswers, firstTryCorrect, setId]);

  const finishSession = useCallback(async () => { setFinished(true); clearSession(setId); try { await api('/api/sessions', { method: 'POST', body: JSON.stringify({ studySetId: setId, mode: 'LEARN', startedAt: startedAt.current, correctAnswers, incorrectAnswers, totalAnswers: correctAnswers + incorrectAnswers }) }); } catch { /* Metrics are best effort. */ } }, [correctAnswers, incorrectAnswers, setId]);
  // Moves the queue forward: a wrong (or not-yet-mastered) answer gets reinserted a few cards later so it comes back for another try.
  const advance = useCallback((itemId: string, wasCorrect: boolean, itemProgress: StudyItem['progress']) => {
    const needsRepeat = !wasCorrect || itemProgress.status !== 'MASTERED';
    if (needsRepeat) {
      setQueue((items) => {
        const nextQueue = [...items];
        nextQueue.splice(repeatInsertIndex(position, nextQueue.length), 0, itemId);
        return nextQueue;
      });
    }
    setFeedback(null); setWritten('');
    if (position >= queue.length - 1 && !needsRepeat) void finishSession(); else setPosition((value) => value + 1);
  }, [finishSession, position, queue.length]);
  const answer = useCallback(async (selected: string, forceIncorrect = false) => {
    if (!current || feedback || submitting) return;
    setSubmitting(true);
    const correct = !forceIncorrect && isAnswerCorrect(selected, correctAnswer);
    try {
      const progress = await api<StudyItem['progress']>('/api/progress', { method: 'POST', body: JSON.stringify({ studySetId: setId, studyItemId: current.id, action: correct ? 'correct' : 'incorrect' }) });
      setSet((data) => data ? { ...data, items: data.items.map((item) => item.id === current.id ? { ...item, progress } : item) } : data);
      setFeedback({ correct, selected, correctAnswer, progress });
      if (correct) { setCorrectAnswers((value) => value + 1); if (!seen.has(current.id)) setFirstTryCorrect((value) => value + 1); }
      else { setIncorrectAnswers((value) => value + 1); setWrongIds((ids) => new Set(ids).add(current.id)); }
      setSeen((ids) => new Set(ids).add(current.id));
    } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể chấm đáp án.', type: 'error' }); }
    finally { setSubmitting(false); }
  }, [correctAnswer, current, feedback, seen, setId, submitting]);
  // Trả lời đúng: tự động chuyển sang câu tiếp theo sau một nhịp ngắn. Trả lời sai: dừng lại, chỉ chuyển khi người dùng bấm Tiếp tục.
  useEffect(() => {
    if (!feedback?.correct || !current) return;
    const timer = window.setTimeout(() => advance(current.id, true, feedback.progress), 700);
    return () => window.clearTimeout(timer);
  }, [feedback, current, advance]);
  const continueNext = useCallback(() => { if (!feedback || !current) return; advance(current.id, feedback.correct, feedback.progress); }, [advance, current, feedback]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if (target.matches('input, textarea, select, [contenteditable="true"]')) return; if (event.key === 'Enter' && feedback && !feedback.correct) continueNext(); else if (!feedback && /^[1-4]$/.test(event.key)) { const option = options[Number(event.key) - 1]; if (option) void answer(option.content); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [answer, feedback, continueNext, options]);
  const submitWritten = (event: SyntheticEvent<HTMLFormElement>) => { event.preventDefault(); if (written.trim()) void answer(written); };
  const [restartOpen, setRestartOpen] = useState(false);

  if (loading) return <LoadingState label="Đang chuẩn bị vòng học..." />;
  if (error || !set) return <ErrorState message={error || 'Không tìm thấy bộ học.'} onRetry={() => void load()} />;
  if (!set.items.length) return <main className="mx-auto max-w-3xl px-4 py-10"><ModeNav setId={setId} active="learn" /><EmptyState title="Chưa có nội dung học." description="Thêm câu hỏi trước khi bắt đầu." action={<Button render={<Link href={`/sets/${setId}/edit`} />}>Thêm câu hỏi</Button>} /></main>;
  const mastered = set.items.filter((item) => item.progress.status === 'MASTERED').length;
  if (finished) return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><ModeNav setId={setId} active="learn" /><section className="rounded-3xl border border-border bg-card p-7 text-center sm:p-10"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><CheckCircle2 className="size-7" /></span><h1 className="mt-5 text-3xl font-bold">Kết quả học</h1><p className="mt-2 text-muted-foreground">Bạn vừa hoàn thành một vòng học thích ứng.</p><div className="mx-auto mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-background/45 p-4"><strong className="block text-2xl">{firstTryCorrect}</strong><span className="text-xs text-muted-foreground">Đúng lần đầu</span></div><div className="rounded-xl bg-background/45 p-4"><strong className="block text-2xl text-rose-300">{incorrectAnswers}</strong><span className="text-xs text-muted-foreground">Sai</span></div><div className="rounded-xl bg-background/45 p-4"><strong className="block text-2xl text-emerald-300">{mastered}</strong><span className="text-xs text-muted-foreground">Đã thuộc</span></div><div className="rounded-xl bg-background/45 p-4"><strong className="block text-2xl text-amber-300">{set.items.length - mastered}</strong><span className="text-xs text-muted-foreground">Cần học thêm</span></div></div><div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">{wrongIds.size > 0 && <Button variant="outline" onClick={() => start(set, [...wrongIds])}><RotateCcw />Học lại câu sai</Button>}<Button onClick={() => start(set)}>Tiếp tục học<ArrowRight /></Button><Button variant="outline" onClick={() => restart(set)}><RotateCcw />Học lại từ đầu</Button><Button variant="ghost" render={<Link href={`/sets/${setId}`} />}>Về bộ học</Button></div></section></main>;
  if (!current) return <LoadingState />;
  // "Tiến độ" tracks how far through this session's set you've gone (items answered at least
  // once), not the long-term "Đã thuộc" mastery count — that grows far too slowly (needs 2
  // correct answers in separate rounds) to give any visible feedback while studying.
  const progressSeen = Math.min(seen.size, set.items.length);
  const progressPercent = set.items.length ? (progressSeen / set.items.length) * 100 : 0;
  return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8"><div className="mb-5 flex items-center justify-between gap-3"><Link href={`/sets/${setId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{set.title}</Link><Button variant="ghost" size="sm" onClick={() => setRestartOpen(true)}><RotateCcw />Học lại từ đầu</Button></div><ModeNav setId={setId} active="learn" /><div className="mb-5 flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-300 ring-1 ring-violet-400/30">{progressSeen}</span><div className="min-w-0 flex-1"><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">Tiến độ</span><span className="text-muted-foreground">{progressSeen} / {set.items.length}</span></div><Progress value={progressPercent} className="[&_[data-slot=progress-track]]:h-2.5 [&_[data-slot=progress-track]]:rounded-full" /></div></div>
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] sm:p-8"><span className="text-xs font-bold uppercase tracking-[.12em] text-violet-300">Câu {current.order + 1} · Chọn một đáp án</span><h1 className="mt-5 whitespace-pre-wrap text-xl font-semibold leading-relaxed sm:text-2xl">{prompt}</h1>
      {options.length >= 2 ? <div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option, optionIndex) => { const selected = feedback && normalizeText(feedback.selected) === normalizeText(option.content); const correctOption = normalizeText(option.content) === normalizeText(correctAnswer); const stateClass = feedback ? correctOption ? 'border-emerald-400 bg-emerald-400/10 text-emerald-100' : selected ? 'border-rose-400 bg-rose-400/10 text-rose-100' : 'border-border opacity-60' : 'border-border hover:border-violet-400/60 hover:bg-violet-400/5'; return <button key={`${option.content}-${optionIndex}`} disabled={Boolean(feedback) || submitting} onClick={() => void answer(option.content)} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left transition ${stateClass}`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold">{optionLetter(optionIndex)}</span><span className="font-medium leading-5">{option.content}</span>{feedback && correctOption && <CheckCircle2 className="ml-auto size-5 shrink-0 text-emerald-300" />}{feedback && selected && !correctOption && <XCircle className="ml-auto size-5 shrink-0 text-rose-300" />}</button>; })}</div> : <form onSubmit={submitWritten} className="mt-7 flex flex-col gap-3 sm:flex-row"><Input value={written} onChange={(event) => setWritten(event.target.value)} placeholder="Nhập câu trả lời..." disabled={Boolean(feedback)} className="h-12 flex-1" /><Button className="h-12" disabled={!written.trim() || Boolean(feedback) || submitting}>Kiểm tra</Button></form>}
      {!feedback ? <div className="mt-5 text-right"><Button variant="ghost" onClick={() => void answer('', true)} disabled={submitting}>Không biết?</Button></div> : <div className={`mt-6 rounded-2xl border p-5 ${feedback.correct ? 'border-emerald-400/35 bg-emerald-400/8' : 'border-rose-400/35 bg-rose-400/8'}`}><div className="flex items-center gap-2 font-semibold">{feedback.correct ? <><CheckCircle2 className="text-emerald-300" />Chính xác!</> : <><XCircle className="text-rose-300" />Chưa chính xác</>}</div><p className="mt-1 text-sm text-muted-foreground">{feedback.correct ? 'Tuyệt vời, cứ thế phát huy nhé!' : 'Không sao, câu này sẽ quay lại sau để bạn ôn thêm.'}</p>{!feedback.correct && <p className="mt-3 text-sm"><span className="text-muted-foreground">Đáp án đúng:</span> <strong>{feedback.correctAnswer}</strong></p>}{current.explanation && <p className="mt-2 text-sm leading-6"><span className="text-muted-foreground">Giải thích:</span> {current.explanation}</p>}<div className="mt-4 flex justify-end">{feedback.correct ? <span className="text-sm text-muted-foreground">Đang chuyển sang câu tiếp theo…</span> : <Button onClick={continueNext}>Tiếp tục <kbd className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">Enter</kbd></Button>}</div></div>}
    </section>
    <ConfirmDialog open={restartOpen} onOpenChange={setRestartOpen} title="Học lại từ đầu?" description="Phiên học hiện tại sẽ bắt đầu lại từ câu đầu tiên của bộ học, kể cả những câu đã thuộc. Số lần đúng/sai đã lưu của từng câu vẫn được giữ nguyên." confirmLabel="Học lại từ đầu" onConfirm={() => { restart(set); setRestartOpen(false); }} />
  </main>;
}
