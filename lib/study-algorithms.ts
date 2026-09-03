import { normalizeText, shuffle } from '@/lib/client-api';
import type { StudyItem } from '@/lib/types';

export function isAnswerCorrect(actual: string, expected: string) {
  return normalizeText(actual.trim()) === normalizeText(expected.trim());
}

/** Labels answer choices A, B, C, D… (0 → "A", 1 → "B", …) for display. */
export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

export type McqOption = { content: string; isCorrect: boolean };
export type Mcq = { prompt: string; correctAnswer: string; options: McqOption[] };

const CHOICE_LINE = /^[ \t]*\(?([A-D])\)?[.):]\s+(.+?)\s*$/;
const CORRECT_ANSWER_PREFIX = /(?:đáp\s*án\s*đúng|correct\s*answer|đáp\s*án)\s*(?:là)?\s*[:\-.]?\s*\(?([A-D])\)?\b/i;

/**
 * Some imported/pasted content packs a full multiple-choice question into a single "question" field
 * (with "A. ...", "B. ...", "C. ...", "D. ..." lines) and puts "Đáp án đúng: X. ..." in "answer",
 * instead of using structured StudyOption rows. Detect that shape and pull the real A–D choices and
 * the real correct answer out of it, so Learn/Test can grade against them instead of fabricating
 * unrelated distractors from other items' answers.
 */
export function parseInlineChoices(question: string, answer: string): Mcq | null {
  const lines = question.split(/\r?\n/);
  const choices: { letter: string; text: string }[] = [];
  let splitIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const match = CHOICE_LINE.exec(lines[index]);
    if (match) {
      if (splitIndex === -1) splitIndex = index;
      choices.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
    } else if (splitIndex !== -1 && lines[index].trim() !== '') break;
  }
  if (splitIndex < 1 || choices.length < 2 || choices.length > 6) return null;
  if (new Set(choices.map((choice) => choice.letter)).size !== choices.length) return null;
  const correctLetter = CORRECT_ANSWER_PREFIX.exec(answer)?.[1]?.toUpperCase();
  const correctChoice = choices.find((choice) => choice.letter === correctLetter);
  const prompt = lines.slice(0, splitIndex).join('\n').trim();
  if (!correctChoice || !prompt) return null;
  return { prompt, correctAnswer: correctChoice.text, options: choices.map((choice) => ({ content: choice.text, isCorrect: choice.letter === correctChoice.letter })) };
}

/** Resolves the question prompt, the real correct-answer text, and the answer choices to show for one study item. */
export function resolveMcq(item: StudyItem, allItems: StudyItem[]): Mcq {
  if (item.options.length >= 2) return { prompt: item.question, correctAnswer: item.answer, options: shuffle(item.options.map((option) => ({ content: option.content, isCorrect: option.isCorrect }))) };
  const inline = parseInlineChoices(item.question, item.answer);
  if (inline) return { ...inline, options: shuffle(inline.options) };
  const otherAnswers = [...new Set(allItems.map((candidate) => candidate.answer.trim()).filter((value) => value && normalizeText(value) !== normalizeText(item.answer)))];
  const distractors = shuffle(otherAnswers).slice(0, 3);
  if (!distractors.length) return { prompt: item.question, correctAnswer: item.answer, options: [] };
  return { prompt: item.question, correctAnswer: item.answer, options: shuffle([{ content: item.answer, isCorrect: true }, ...distractors.map((content) => ({ content, isCorrect: false }))]) };
}

export function repeatInsertIndex(currentIndex: number, queueLength: number, random = Math.random()) {
  const delay = Math.floor(random * 6) + 3;
  return Math.min(queueLength, currentIndex + delay);
}

export function scoreAnswers(questions: { itemId: string; answer: string }[], answers: Record<string, string>) {
  const details = questions.map((question) => ({ itemId: question.itemId, correct: isAnswerCorrect(answers[question.itemId] ?? '', question.answer) }));
  return { correct: details.filter((detail) => detail.correct).length, incorrect: details.filter((detail) => !detail.correct).length, details };
}
