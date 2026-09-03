import { describe, expect, it } from 'vitest';
import { guessMapping, parsePasted, rowsToItems } from '@/lib/importer';

describe('import parsing', () => {
  it('parses tab-separated Vietnamese flashcards', () => {
    const rows = parsePasted('Thủ đô Việt Nam?\tHà Nội\n2 + 2?\t4', '\t', '\n');
    expect(rows).toHaveLength(2);
    expect(rows[0].item?.answer).toBe('Hà Nội');
  });

  it('marks incomplete rows instead of crashing', () => {
    const rows = parsePasted('Có câu hỏi\t\n\tCó đáp án', '\t', '\n');
    expect(rows.every((row) => Boolean(row.error))).toBe(true);
  });

  it('handles 1000 rows', () => {
    const input = Array.from({ length: 1000 }, (_, index) => `Câu ${index + 1}\tĐáp án ${index + 1}`).join('\n');
    expect(parsePasted(input, '\t', '\n')).toHaveLength(1000);
  });

  it('maps a full multiple-choice sheet', () => {
    const headers = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation'];
    const mapping = guessMapping(headers);
    const [row] = rowsToItems([['Thủ đô?', 'Hà Nội', 'Huế', 'Đà Nẵng', 'Hải Phòng', 'A', 'Thủ đô Việt Nam']], mapping);
    expect(row.item?.answer).toBe('Hà Nội');
    expect(row.item?.options).toHaveLength(4);
    expect(row.item?.options?.[0].isCorrect).toBe(true);
  });
});
