import { describe, expect, it } from 'vitest';
import { isAnswerCorrect, parseInlineChoices, repeatInsertIndex, resolveMcq, scoreAnswers } from '@/lib/study-algorithms';
import type { StudyItem } from '@/lib/types';

function item(overrides: Partial<StudyItem>): StudyItem {
  return { id: 'i1', studySetId: 's1', question: '', answer: '', explanation: '', order: 0, options: [], progress: { status: 'NEW', correctCount: 0, incorrectCount: 0, learningScore: 0, lastStudiedAt: null }, ...overrides };
}

describe('study algorithms', () => {
  it('scores answers case-insensitively and safely with Vietnamese', () => {
    expect(isAnswerCorrect('  HÀ NỘI ', 'Hà Nội')).toBe(true);
    expect(isAnswerCorrect('Huế', 'Hà Nội')).toBe(false);
  });

  it('repeats a wrong answer after 3–8 positions when the queue allows it', () => {
    expect(repeatInsertIndex(4, 30, 0)).toBe(7);
    expect(repeatInsertIndex(4, 30, .999)).toBe(12);
    expect(repeatInsertIndex(8, 10, .999)).toBe(10);
  });

  it('calculates final test scoring', () => {
    const score = scoreAnswers([{ itemId: '1', answer: 'A' }, { itemId: '2', answer: 'B' }], { '1': 'a', '2': 'C' });
    expect(score.correct).toBe(1);
    expect(score.incorrect).toBe(1);
  });

  it('recovers real A–D choices pasted straight into the question/answer text', () => {
    const question = '1. Ban chấp hành Trung ương Đảng chủ trương thành lập nước Việt Nam dân chủ cộng hoà tại Hội nghị nào?\nA. Hội nghị trung ương tháng 10/1930\nB. Hội nghị trung ương VI tháng 11/1939\nC. Hội nghị trung ương VII tháng 11/1940\nD. Hội nghị trung ương VIII tháng 5/1941';
    const answer = 'Đáp án đúng: D. Hội nghị trung ương VIII tháng 5/1941';
    const parsed = parseInlineChoices(question, answer);
    expect(parsed?.prompt).toBe('1. Ban chấp hành Trung ương Đảng chủ trương thành lập nước Việt Nam dân chủ cộng hoà tại Hội nghị nào?');
    expect(parsed?.correctAnswer).toBe('Hội nghị trung ương VIII tháng 5/1941');
    expect(parsed?.options).toHaveLength(4);
    expect(parsed?.options.filter((option) => option.isCorrect)).toEqual([{ content: 'Hội nghị trung ương VIII tháng 5/1941', isCorrect: true }]);
  });

  it('resolveMcq uses the parsed choices instead of unrelated distractors from other items, and grades against the real answer', () => {
    const target = item({ id: 'target', question: 'Câu hỏi X?\nA. Sai 1\nB. Đúng\nC. Sai 2\nD. Sai 3', answer: 'Đáp án đúng: B. Đúng' });
    const other = item({ id: 'other', question: 'Câu khác?', answer: 'Đáp án đúng: A. Không liên quan' });
    const mcq = resolveMcq(target, [target, other]);
    expect(mcq.prompt).toBe('Câu hỏi X?');
    expect(mcq.correctAnswer).toBe('Đúng');
    expect(mcq.options.map((option) => option.content).sort()).toEqual(['Sai 1', 'Sai 2', 'Sai 3', 'Đúng'].sort());
    expect(mcq.options.some((option) => option.content.includes('Không liên quan'))).toBe(false);
    expect(isAnswerCorrect('Đúng', mcq.correctAnswer)).toBe(true);
  });

  it('falls back to cross-item distractors when the question has no embedded A–D choices', () => {
    const target = item({ id: 'target', question: 'Thủ đô Việt Nam?', answer: 'Hà Nội' });
    const other = item({ id: 'other', question: 'X?', answer: 'Huế' });
    const mcq = resolveMcq(target, [target, other]);
    expect(mcq.correctAnswer).toBe('Hà Nội');
    expect(mcq.options.map((option) => option.content)).toContain('Huế');
  });
});
