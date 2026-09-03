'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Expand, RotateCcw, Settings2, Shuffle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ModeNav } from '@/components/mode-nav';
import { api, shuffle } from '@/lib/client-api';
import type { StudyItem, StudySet } from '@/lib/types';

export function FlashcardMode({ setId }: { setId: string }) {
  const [set, setSet] = useState<StudySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deck, setDeck] = useState<StudyItem[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [answerFirst, setAnswerFirst] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [finished, setFinished] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const startedAt = useRef(new Date().toISOString());

  const buildDeck = useCallback((source: StudySet, forceShuffle?: boolean) => {
    let next = source.items.filter((item) => !onlyUnmastered || item.progress.status !== 'MASTERED').filter((item) => !onlyWrong || item.progress.incorrectCount > 0);
    if (shuffleOn || forceShuffle) next = shuffle(next);
    setDeck(next); setIndex(0); setFlipped(false); setFinished(false); setCorrect(0); setIncorrect(0); startedAt.current = new Date().toISOString();
  }, [onlyUnmastered, onlyWrong, shuffleOn]);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await api<StudySet>(`/api/sets/${setId}`); setSet(data); const requestedShuffle = new URLSearchParams(window.location.search).get('shuffle') === '1'; setShuffleOn(requestedShuffle); let initial = data.items; if (requestedShuffle) initial = shuffle(initial); setDeck(initial); } catch (value) { setError(value instanceof Error ? value.message : 'Không thể tải flashcard.'); } finally { setLoading(false); } }, [setId]);
  useEffect(() => { void load(); }, [load]);
  const current = deck[index];

  const finish = useCallback(async (finalCorrect: number, finalIncorrect: number) => { setFinished(true); try { await api('/api/sessions', { method: 'POST', body: JSON.stringify({ studySetId: setId, mode: 'FLASHCARDS', startedAt: startedAt.current, correctAnswers: finalCorrect, incorrectAnswers: finalIncorrect, totalAnswers: finalCorrect + finalIncorrect }) }); } catch { /* Progress is already durable; session metrics are best effort. */ } }, [setId]);
  const advance = useCallback(() => { if (index >= deck.length - 1) { void finish(correct, incorrect); return; } setIndex((value) => value + 1); setFlipped(false); }, [correct, deck.length, finish, incorrect, index]);
  const mark = useCallback(async (known: boolean) => { if (!current) return; const nextCorrect = correct + (known ? 1 : 0), nextIncorrect = incorrect + (known ? 0 : 1); if (known) setCorrect(nextCorrect); else setIncorrect(nextIncorrect); try { const progress = await api<StudyItem['progress']>('/api/progress', { method: 'POST', body: JSON.stringify({ studySetId: setId, studyItemId: current.id, action: known ? 'mastered' : 'learning' }) }); setDeck((items) => items.map((item) => item.id === current.id ? { ...item, progress } : item)); if (index >= deck.length - 1) void finish(nextCorrect, nextIncorrect); else if (autoAdvance) setTimeout(advance, 350); else advance(); } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể lưu tiến độ.', type: 'error' }); } }, [advance, autoAdvance, correct, current, deck.length, finish, incorrect, index, setId]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if (target.matches('input, textarea, select, [contenteditable="true"]')) return; if (event.code === 'Space') { event.preventDefault(); setFlipped((value) => !value); } else if (event.key === 'ArrowLeft') { setIndex((value) => Math.max(0, value - 1)); setFlipped(false); } else if (event.key === 'ArrowRight') { setIndex((value) => Math.min(deck.length - 1, value + 1)); setFlipped(false); } else if (event.key === '1') void mark(false); else if (event.key === '2') void mark(true); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [deck.length, mark]);
  const applySettings = () => { if (set) buildDeck(set); setSettingsOpen(false); };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast.add({ title: 'Trình duyệt không hỗ trợ toàn màn hình.', type: 'info' }); } };

  if (loading) return <LoadingState label="Đang chuẩn bị thẻ học..." />;
  if (error || !set) return <ErrorState message={error || 'Không tìm thấy bộ học.'} onRetry={() => void load()} />;
  if (!set.items.length) return <main className="mx-auto max-w-3xl px-4 py-10"><ModeNav setId={setId} active="flashcards" /><EmptyState title="Chưa có nội dung học." description="Thêm câu hỏi hoặc import dữ liệu trước khi mở Flashcard." action={<Button render={<Link href={`/sets/${setId}/edit`} />}>Thêm câu hỏi</Button>} /></main>;
  if (!deck.length) return <main className="mx-auto max-w-3xl px-4 py-10"><ModeNav setId={setId} active="flashcards" /><EmptyState title="Không có thẻ phù hợp." description="Bộ lọc hiện tại không tìm thấy thẻ cần học." action={<Button onClick={() => { setOnlyUnmastered(false); setOnlyWrong(false); buildDeck(set); }}>Học tất cả thẻ</Button>} /></main>;
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"><div className="mb-5 flex items-center justify-between"><Link href={`/sets/${setId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{set.title}</Link><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Cài đặt" onClick={() => setSettingsOpen(true)}><Settings2 /></Button><Button variant="ghost" size="icon" aria-label="Toàn màn hình" onClick={() => void toggleFullscreen()}><Expand /></Button></div></div><ModeNav setId={setId} active="flashcards" />
    {finished ? <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center sm:p-12"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Check className="size-7" /></span><h1 className="mt-5 text-3xl font-bold">Hoàn thành lượt học</h1><p className="mt-2 text-muted-foreground">Bạn đã xem hết {deck.length} thẻ.</p><div className="mx-auto mt-7 grid max-w-sm grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-400/8 p-4"><strong className="block text-2xl text-emerald-300">{correct}</strong><span className="text-sm text-muted-foreground">Đã thuộc</span></div><div className="rounded-xl bg-rose-400/8 p-4"><strong className="block text-2xl text-rose-300">{incorrect}</strong><span className="text-sm text-muted-foreground">Chưa thuộc</span></div></div><div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row"><Button variant="outline" onClick={() => buildDeck(set)}><RotateCcw />Học lại</Button><Button render={<Link href={`/sets/${setId}/learn`} />}>Chuyển sang Học<ArrowRight /></Button></div></section> : <><button onClick={() => setFlipped((value) => !value)} className="flashcard-stage block w-full text-left" aria-label={flipped ? 'Lật về mặt trước' : 'Lật sang mặt sau'}><span className={`flashcard-inner block ${flipped ? 'is-flipped' : ''}`}><span className="flashcard-face flex min-h-[390px] flex-col rounded-3xl border border-border bg-card p-6 shadow-[0_24px_80px_rgba(0,0,0,.25)] sm:min-h-[480px] sm:p-12"><span className="text-xs font-bold uppercase tracking-[.12em] text-violet-300">{answerFirst ? 'Đáp án' : 'Câu hỏi'} · {index + 1}</span><span className="m-auto max-w-3xl whitespace-pre-wrap text-center text-2xl font-semibold leading-relaxed sm:text-3xl">{answerFirst ? current.answer : current.question}</span><span className="text-center text-xs text-muted-foreground">Nhấn Space hoặc click vào thẻ để lật</span></span><span className="flashcard-face flashcard-back flex min-h-[390px] flex-col rounded-3xl border border-violet-400/35 bg-[#161d34] p-6 shadow-[0_24px_80px_rgba(0,0,0,.25)] sm:min-h-[480px] sm:p-12"><span className="text-xs font-bold uppercase tracking-[.12em] text-violet-300">{answerFirst ? 'Câu hỏi' : 'Đáp án'}</span><span className="m-auto max-w-3xl whitespace-pre-wrap text-center text-2xl font-semibold leading-relaxed sm:text-3xl">{answerFirst ? current.question : current.answer}{current.explanation && <span className="mt-8 block border-t border-border pt-6 text-base font-normal text-muted-foreground"><strong className="text-foreground">Giải thích:</strong> {current.explanation}</span>}</span><span className="text-center text-xs text-muted-foreground">Click để quay lại</span></span></span></button>
      <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" className="h-12 border-rose-400/35 text-rose-200 hover:bg-rose-400/10" onClick={() => void mark(false)}><X />Chưa thuộc <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] sm:inline">1</kbd></Button><Button className="h-12 bg-emerald-500 text-white hover:bg-emerald-400" onClick={() => void mark(true)}><Check />Đã thuộc <kbd className="ml-auto hidden rounded bg-white/15 px-1.5 py-0.5 text-[10px] sm:inline">2</kbd></Button></div>
      <div className="mt-6"><div className="mb-2 flex items-center justify-between text-sm text-muted-foreground"><span>{index + 1} / {deck.length}</span><span>{Math.round(((index + 1) / deck.length) * 100)}%</span></div><Progress value={((index + 1) / deck.length) * 100} className="[&_[data-slot=progress-track]]:h-2" /></div>
      <div className="mt-5 flex items-center justify-center gap-2"><Button variant="ghost" onClick={() => { setIndex((value) => Math.max(0, value - 1)); setFlipped(false); }} disabled={index === 0}><ArrowLeft />Trước</Button><Button variant="ghost" onClick={() => setDeck((items) => shuffle(items))}><Shuffle />Xáo trộn</Button><Button variant="ghost" onClick={() => { setIndex((value) => Math.min(deck.length - 1, value + 1)); setFlipped(false); }} disabled={index === deck.length - 1}>Sau<ArrowRight /></Button></div></>}
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>Cài đặt Flashcard</DialogTitle><DialogDescription>Chọn cách bạn muốn duyệt bộ thẻ.</DialogDescription></DialogHeader><div className="space-y-4">{[[shuffleOn, setShuffleOn, 'Xáo trộn thẻ'], [onlyUnmastered, setOnlyUnmastered, 'Chỉ học câu chưa thuộc'], [onlyWrong, setOnlyWrong, 'Chỉ học câu từng trả lời sai'], [answerFirst, setAnswerFirst, 'Hiển thị đáp án trước'], [autoAdvance, setAutoAdvance, 'Tự chuyển sau khi đánh giá']].map(([checked, setter, label]) => <label key={label as string} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm"><Checkbox checked={checked as boolean} onCheckedChange={(value) => (setter as (value: boolean) => void)(Boolean(value))} /><span>{label as string}</span></label>)}</div><DialogFooter><Button variant="outline" onClick={() => setSettingsOpen(false)}>Hủy</Button><Button onClick={applySettings}>Áp dụng</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
