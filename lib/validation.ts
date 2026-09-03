import { z } from 'zod';

export const optionSchema = z.object({
  id: z.string().optional(),
  content: z.string().trim().min(1, 'Nội dung lựa chọn không được để trống.'),
  isCorrect: z.boolean(),
  order: z.number().int().min(0),
});

export const itemSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(1, 'Câu hỏi không được để trống.'),
  answer: z.string().trim().min(1, 'Đáp án không được để trống.'),
  explanation: z.string().trim().optional().default(''),
  options: z.array(optionSchema).max(8).optional().default([]),
}).superRefine((item, context) => {
  if (item.options.length > 0 && item.options.filter((option) => option.isCorrect).length !== 1) {
    context.addIssue({ code: 'custom', message: 'Câu trắc nghiệm cần đúng một đáp án.', path: ['options'] });
  }
});

export const setSchema = z.object({
  title: z.string().trim().min(1, 'Tên bộ học không được để trống.').max(160),
  description: z.string().trim().max(1000).optional().default(''),
  items: z.array(itemSchema).max(5000).optional().default([]),
}).superRefine((set, context) => {
  const keys = set.items.map((item) => item.question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi'));
  if (new Set(keys).size !== keys.length) context.addIssue({ code: 'custom', message: 'Bộ học có câu hỏi bị trùng lặp.', path: ['items'] });
});

export const progressSchema = z.object({
  studySetId: z.string().min(1),
  studyItemId: z.string().min(1),
  action: z.enum(['correct', 'incorrect', 'mastered', 'learning', 'new']),
});

export const sessionSchema = z.object({
  studySetId: z.string().min(1),
  mode: z.enum(['FLASHCARDS', 'LEARN', 'TEST']),
  startedAt: z.iso.datetime().optional(),
  correctAnswers: z.number().int().min(0),
  incorrectAnswers: z.number().int().min(0),
  totalAnswers: z.number().int().min(0),
});
