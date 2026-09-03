'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileText, LoaderCircle, UploadCloud, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { api, normalizeText } from '@/lib/client-api';
import { guessMapping, parsePasted, rowsToItems, type ColumnMapping, type ImportRow } from '@/lib/importer';
import type { StudySet, StudySetSummary } from '@/lib/types';

const mappingLabels: [keyof ColumnMapping, string][] = [['question', 'Câu hỏi'], ['answer', 'Đáp án'], ['optionA', 'Lựa chọn A'], ['optionB', 'Lựa chọn B'], ['optionC', 'Lựa chọn C'], ['optionD', 'Lựa chọn D'], ['correct', 'Đáp án đúng'], ['explanation', 'Giải thích']];

export function ImportPage() {
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [termType, setTermType] = useState('tab');
  const [cardType, setCardType] = useState('newline');
  const [customTerm, setCustomTerm] = useState('|');
  const [customCard, setCustomCard] = useState(';;');
  const [sets, setSets] = useState<StudySetSummary[]>([]);
  const [targetId, setTargetId] = useState('new');
  const [newTitle, setNewTitle] = useState('Bộ học mới');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ question: 0, answer: 1, optionA: -1, optionB: -1, optionC: -1, optionD: -1, correct: -1, explanation: -1 });
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void api<StudySetSummary[]>('/api/sets').then((data) => { setSets(data); const setId = new URLSearchParams(window.location.search).get('setId'); if (setId && data.some((set) => set.id === setId)) setTargetId(setId); }).catch(() => undefined); }, []);

  const termSeparator = termType === 'tab' ? '\t' : termType === 'comma' ? ',' : termType === 'semicolon' ? ';' : customTerm;
  const cardSeparator = cardType === 'newline' ? '\n' : cardType === 'semicolon' ? ';' : customCard;
  const rawParsed = useMemo<ImportRow[]>(() => mode === 'paste' ? parsePasted(text, termSeparator, cardSeparator) : rowsToItems(rows, mapping), [cardSeparator, mapping, mode, rows, termSeparator, text]);
  const parsed = useMemo(() => {
    const seen = new Set<string>();
    return rawParsed.map((row) => {
      if (!row.item) return row;
      const key = normalizeText(row.item.question);
      if (seen.has(key)) return { row: row.row, error: 'Câu hỏi bị trùng trong dữ liệu import.' };
      seen.add(key);
      return row;
    });
  }, [rawParsed]);
  const valid = parsed.filter((row) => row.item).map((row) => row.item!);
  const errors = parsed.filter((row) => row.error);

  const readFile = useCallback(async (file: File) => {
    const extension = file.name.split('.').pop()?.toLocaleLowerCase();
    if (!['txt', 'csv', 'xlsx'].includes(extension ?? '')) return toast.add({ title: 'Định dạng file không hỗ trợ.', description: 'Hãy chọn file TXT, CSV hoặc XLSX.', type: 'error' });
    if (!file.size) return toast.add({ title: 'File import đang trống.', type: 'warning' });
    setReading(true); setFileName(file.name);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (extension === 'txt') { setText(await file.text()); setMode('paste'); setTermType('tab'); setCardType('newline'); return; }
      let matrix: string[][];
      if (extension === 'csv') matrix = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true }).data.map((row) => row.map(String));
      else { const XLSX = await import('xlsx'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }).map((row) => row.map(String)); }
      if (!matrix.length) throw new Error('File không chứa dữ liệu.');
      const first = matrix[0];
      const looksLikeHeader = first.some((value) => ['question', 'cau hoi', 'answer', 'dap an', 'option'].some((word) => normalizeText(value).includes(word)));
      const nextHeaders = looksLikeHeader ? first : first.map((_, index) => `Cột ${String.fromCharCode(65 + index)}`);
      setHeaders(nextHeaders); setRows(looksLikeHeader ? matrix.slice(1) : matrix); setMapping(guessMapping(nextHeaders)); setMode('file');
    } catch (value) { toast.add({ title: 'Không thể đọc file.', description: value instanceof Error ? value.message : undefined, type: 'error' }); setFileName(''); setRows([]); }
    finally { setReading(false); }
  }, []);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ''; };
  const onDrop = (event: DragEvent) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void readFile(file); };

  const runImport = async () => {
    if (!valid.length) return toast.add({ title: 'Chưa có dòng hợp lệ để import.', type: 'warning' });
    setImporting(true);
    try {
      let saved: StudySet;
      let importedCount = valid.length;
      if (targetId === 'new') saved = await api<StudySet>('/api/sets', { method: 'POST', body: JSON.stringify({ title: newTitle, description: `Được import từ ${fileName || 'nội dung dán'}.`, items: valid }) });
      else { const current = await api<StudySet>(`/api/sets/${targetId}`); const existing = new Set(current.items.map((item) => normalizeText(item.question))); const unique = valid.filter((item) => !existing.has(normalizeText(item.question))); importedCount = unique.length; if (!unique.length) throw new Error('Tất cả câu hỏi đều đã tồn tại trong bộ học.'); saved = await api<StudySet>(`/api/sets/${targetId}`, { method: 'PUT', body: JSON.stringify({ title: current.title, description: current.description, items: [...current.items.map((item) => ({ id: item.id, question: item.question, answer: item.answer, explanation: item.explanation, options: item.options })), ...unique] }) }); }
      toast.add({ title: `Import thành công ${importedCount}/${parsed.length} câu.`, type: 'success' });
      window.location.assign(`/sets/${saved.id}`);
    } catch (value) { toast.add({ title: value instanceof Error ? value.message : 'Không thể import dữ liệu.', type: 'error' }); }
    finally { setImporting(false); }
  };

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"><Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Thư viện</Link><div className="mb-8"><p className="text-sm font-semibold text-violet-300">Thêm nhanh hàng loạt</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Import dữ liệu</h1><p className="mt-2 text-sm text-muted-foreground">Dán nội dung hoặc đọc file TXT, CSV, XLSX. Bạn luôn được xem trước trước khi xác nhận.</p></div>
    <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr] sm:p-6"><label className="space-y-2"><span className="text-sm font-semibold">Thêm vào</span><Select value={targetId} onValueChange={(value) => setTargetId(value ?? 'new')} items={{ new: 'Tạo bộ học mới', ...Object.fromEntries(sets.map((set) => [set.id, set.title])) }}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Tạo bộ học mới</SelectItem>{sets.map((set) => <SelectItem key={set.id} value={set.id}>{set.title}</SelectItem>)}</SelectContent></Select></label>{targetId === 'new' && <label className="space-y-2"><span className="text-sm font-semibold">Tên bộ học mới</span><Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="h-11" /></label>}</div>
    <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1"><button onClick={() => setMode('paste')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'paste' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><FileText className="size-4" />Copy & Paste</button><button onClick={() => setMode('file')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><FileSpreadsheet className="size-4" />Import file</button></div>
    {mode === 'paste' ? <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={'Câu hỏi 1\tĐáp án 1\nCâu hỏi 2\tĐáp án 2'} className="min-h-72 resize-y bg-background/35 font-mono text-sm leading-6" /><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-sm font-semibold">Giữa câu hỏi và đáp án</p><Select value={termType} onValueChange={(value) => setTermType(value ?? 'tab')} items={{ tab: 'Tab', comma: 'Dấu phẩy', semicolon: 'Dấu chấm phẩy', custom: 'Tùy chỉnh' }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tab">Tab</SelectItem><SelectItem value="comma">Dấu phẩy</SelectItem><SelectItem value="semicolon">Dấu chấm phẩy</SelectItem><SelectItem value="custom">Tùy chỉnh</SelectItem></SelectContent></Select>{termType === 'custom' && <Input value={customTerm} onChange={(event) => setCustomTerm(event.target.value)} className="mt-2" placeholder="Ký tự phân cách" />}</div><div><p className="mb-2 text-sm font-semibold">Giữa các thẻ</p><Select value={cardType} onValueChange={(value) => setCardType(value ?? 'newline')} items={{ newline: 'Dòng mới', semicolon: 'Dấu chấm phẩy', custom: 'Tùy chỉnh' }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newline">Dòng mới</SelectItem><SelectItem value="semicolon">Dấu chấm phẩy</SelectItem><SelectItem value="custom">Tùy chỉnh</SelectItem></SelectContent></Select>{cardType === 'custom' && <Input value={customCard} onChange={(event) => setCustomCard(event.target.value)} className="mt-2" placeholder="Ký tự phân cách" />}</div></div></section> : <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><button onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()} className="grid min-h-52 w-full place-items-center rounded-2xl border border-dashed border-violet-400/35 bg-violet-400/5 p-8 text-center transition hover:bg-violet-400/8"><span><UploadCloud className="mx-auto size-9 text-violet-300" /><strong className="mt-3 block">{reading ? 'Đang đọc file...' : fileName || 'Kéo file vào đây hoặc chọn file'}</strong><span className="mt-1 block text-sm text-muted-foreground">Hỗ trợ .txt, .csv và .xlsx</span></span></button><input ref={inputRef} type="file" accept=".txt,.csv,.xlsx" onChange={onFile} className="hidden" />{headers.length > 0 && <div className="mt-6"><h2 className="text-lg font-semibold">Ghép cột dữ liệu</h2><p className="mt-1 text-sm text-muted-foreground">Chọn cột tương ứng. Các trường lựa chọn là không bắt buộc.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{mappingLabels.map(([field, label]) => <label key={field} className="space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">{label}</span><Select value={String(mapping[field])} onValueChange={(value) => setMapping((current) => ({ ...current, [field]: Number(value ?? -1) }))} items={{ '-1': 'Không dùng', ...Object.fromEntries(headers.map((header, index) => [String(index), header || `Cột ${String.fromCharCode(65 + index)}`])) }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="-1">Không dùng</SelectItem>{headers.map((header, index) => <SelectItem key={`${header}-${index}`} value={String(index)}>{header || `Cột ${String.fromCharCode(65 + index)}`}</SelectItem>)}</SelectContent></Select></label>)}</div></div>}</section>}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Preview: {parsed.length} thẻ</h2><p className="mt-1 text-sm text-muted-foreground">{valid.length} hợp lệ{errors.length ? ` · ${errors.length} dòng lỗi sẽ được bỏ qua` : ''}</p></div><div className="flex gap-2"><Button variant="outline" render={<a href="/samples/memostudy-import.csv" download aria-label="Tải file CSV mẫu" />}><Download />CSV mẫu</Button><Button variant="outline" render={<a href="/samples/memostudy-import.xlsx" download aria-label="Tải file XLSX mẫu" />} className="hidden sm:inline-flex"><Download />XLSX mẫu</Button></div></div>{parsed.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nội dung xem trước sẽ xuất hiện ở đây.</div> : <div className="mt-5 space-y-2">{parsed.slice(0, 8).map((row) => <div key={row.row} className={`rounded-xl border p-4 ${row.error ? 'border-rose-400/35 bg-rose-400/6' : 'border-border bg-background/25'}`}>{row.error ? <div className="flex items-center gap-2 text-sm text-rose-200"><XCircle className="size-4" />Dòng {row.row}: {row.error}</div> : <div className="grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-xs font-semibold uppercase text-muted-foreground">Question</span><span className="mt-1 block line-clamp-2">{row.item?.question}</span></p><p><span className="text-xs font-semibold uppercase text-muted-foreground">Answer</span><span className="mt-1 block line-clamp-2">{row.item?.answer}</span></p></div>}</div>)}{parsed.length > 8 && <p className="pt-2 text-center text-xs text-muted-foreground">và {parsed.length - 8} thẻ khác</p>}</div>}
      {errors.length > 0 && <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-400/8 p-3 text-sm text-amber-100"><XCircle className="mt-0.5 size-4 shrink-0" />{errors.length} dòng không thể import. Các dòng lỗi được đánh dấu và sẽ bị bỏ qua.</div>}
      <Button className="mt-5 h-12 w-full" disabled={!valid.length || importing || (targetId === 'new' && !newTitle.trim())} onClick={() => void runImport()}>{importing ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}{importing ? 'Đang import...' : `Import ${valid.length} thẻ`}</Button>
    </section></main>;
}
