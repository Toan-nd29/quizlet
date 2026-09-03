import Papa from 'papaparse';
import { normalizeText } from '@/lib/client-api';
import type { EditableItem } from '@/lib/types';

export type ColumnMapping = { question: number; answer: number; optionA: number; optionB: number; optionC: number; optionD: number; correct: number; explanation: number };
export type ImportRow = { item?: EditableItem; row: number; error?: string };

export function parsePasted(text: string, termSeparator: string, cardSeparator: string): ImportRow[] {
  if (!text.trim() || !termSeparator || !cardSeparator) return [];
  let rows: string[][];
  if (cardSeparator === '\n' && (termSeparator === ',' || termSeparator === ';')) {
    rows = Papa.parse<string[]>(text, { delimiter: termSeparator, skipEmptyLines: true }).data;
  } else {
    rows = text.split(cardSeparator).filter((row) => row.trim()).map((row) => row.split(termSeparator));
  }
  return rows.map((columns, index) => {
    const question = String(columns[0] ?? '').trim();
    const answer = columns.slice(1).join(termSeparator).trim();
    if (!question) return { row: index + 1, error: 'Thiếu câu hỏi.' };
    if (!answer) return { row: index + 1, error: 'Thiếu đáp án.' };
    return { row: index + 1, item: { question, answer, explanation: '', options: [] } };
  });
}

export function guessMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => normalizeText(header).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim());
  const find = (...names: string[]) => normalized.findIndex((header) => names.includes(header));
  const simple = headers.length <= 3;
  return {
    question: Math.max(0, find('question', 'cau hoi', 'term')),
    answer: find('answer', 'dap an', 'definition') >= 0 ? find('answer', 'dap an', 'definition') : simple && headers.length > 1 ? 1 : -1,
    optionA: find('option a', 'dap an a'), optionB: find('option b', 'dap an b'), optionC: find('option c', 'dap an c'), optionD: find('option d', 'dap an d'),
    correct: find('correct', 'correct answer', 'dap an dung'), explanation: find('explanation', 'giai thich'),
  };
}

export function rowsToItems(rows: string[][], mapping: ColumnMapping, offset = 2): ImportRow[] {
  return rows.map((columns, index) => {
    const value = (column: number) => column >= 0 ? String(columns[column] ?? '').trim() : '';
    const question = value(mapping.question);
    const rawOptions = [mapping.optionA, mapping.optionB, mapping.optionC, mapping.optionD].map(value);
    const optionEntries = rawOptions.map((content, originalIndex) => ({ content, originalIndex })).filter((entry) => entry.content);
    const correctRaw = value(mapping.correct);
    let answer = value(mapping.answer);
    let correctIndex = -1;
    if (optionEntries.length) {
      if (/^[A-D]$/i.test(correctRaw)) correctIndex = correctRaw.toUpperCase().charCodeAt(0) - 65;
      else correctIndex = rawOptions.findIndex((option) => normalizeText(option) === normalizeText(correctRaw || answer));
      if (correctIndex >= 0 && rawOptions[correctIndex]) answer = rawOptions[correctIndex];
    }
    if (!question) return { row: index + offset, error: 'Thiếu câu hỏi.' };
    if (!answer) return { row: index + offset, error: 'Thiếu đáp án hoặc đáp án đúng.' };
    if (optionEntries.length && correctIndex < 0) return { row: index + offset, error: 'Không xác định được đáp án đúng.' };
    return { row: index + offset, item: { question, answer, explanation: value(mapping.explanation), options: optionEntries.map((entry, order) => ({ content: entry.content, order, isCorrect: entry.originalIndex === correctIndex })) } };
  });
}
