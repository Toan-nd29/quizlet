'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/feedback';
import { isAnswerCorrect } from '@/lib/study-algorithms';
import type { TestResultData } from '@/lib/test-types';

export function TestResult({ setId }: { setId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<TestResultData | null | undefined>(undefined);
  useEffect(() => { try { const raw = sessionStorage.getItem(`memostudy:test-result:${setId}`); setResult(raw ? JSON.parse(raw) : null); } catch { setResult(null); } }, [setId]);
  const review = useMemo(() => result?.questions.map((question) => ({ question, userAnswer: result.answers[question.itemId] ?? '', correct: isAnswerCorrect(result.answers[question.itemId] ?? '', question.answer) })) ?? [], [result]);
  if (result === undefined) return <LoadingState />;
  if (!result) return <main className="mx-auto max-w-3xl px-4 py-10"><EmptyState title="Chưa có kết quả kiểm tra." description="Hãy hoàn thành và nộp một bài kiểm tra để xem kết quả." action={<Button render={<Link href={`/sets/${setId}/test`} />}>Tạo bài kiểm tra</Button>} /></main>;
  const correct = review.filter((item) => item.correct).length;
  const percent = review.length ? Math.round((correct / review.length) * 100) : 0;
  const retryWrong = () => { const wrongIds = review.filter((item) => !item.correct).map((item) => item.question.itemId); sessionStorage.setItem(`memostudy:retry:${setId}`, JSON.stringify(wrongIds)); router.push(`/sets/${setId}/test?retry=1`); };
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10"><Link href={`/sets/${setId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{result.setTitle}</Link><section className="mt-5 rounded-3xl border border-border bg-card p-7 text-center sm:p-10"><p className="text-sm font-semibold text-violet-300">Kết quả kiểm tra</p><div className="mt-3 text-6xl font-bold tracking-tight">{percent}%</div><p className="mt-2 text-muted-foreground">{correct} / {review.length} câu chính xác</p><div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-400/8 p-4"><strong className="block text-2xl text-emerald-300">{correct}</strong><span className="text-sm text-muted-foreground">Đúng</span></div><div className="rounded-xl bg-rose-400/8 p-4"><strong className="block text-2xl text-rose-300">{review.length - correct}</strong><span className="text-sm text-muted-foreground">Sai</span></div></div><div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">{correct < review.length && <Button variant="outline" onClick={retryWrong}><RotateCcw />Làm lại câu sai</Button>}<Button render={<Link href={`/sets/${setId}/test`} />}>Làm bài mới</Button></div></section><section className="mt-8"><h2 className="mb-4 text-xl font-bold">Xem lại đáp án</h2><div className="space-y-3">{review.map(({ question, userAnswer, correct: isCorrect }, index) => <article key={question.itemId} className={`rounded-2xl border p-5 ${isCorrect ? 'border-emerald-400/25 bg-emerald-400/5' : 'border-rose-400/25 bg-rose-400/5'}`}><div className="flex items-center gap-2 text-sm font-semibold">{isCorrect ? <CheckCircle2 className="size-5 text-emerald-300" /> : <XCircle className="size-5 text-rose-300" />}Câu {index + 1} · {isCorrect ? 'Chính xác' : 'Chưa chính xác'}</div><p className="mt-3 font-medium leading-6">{question.question}</p><div className="mt-3 space-y-1 text-sm"><p><span className="text-muted-foreground">Đáp án của bạn:</span> {userAnswer || 'Chưa trả lời'}</p>{!isCorrect && <p><span className="text-muted-foreground">Đáp án đúng:</span> <strong>{question.answer}</strong></p>}{question.explanation && <p className="pt-1 text-muted-foreground">Giải thích: {question.explanation}</p>}</div></article>)}</div></section></main>;
}
