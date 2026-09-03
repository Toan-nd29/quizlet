import { createId, DEFAULT_USER_ID, getDatabase } from '@/lib/database';
import type { EditableItem, ProgressStatus, StudyItem, StudySet, StudySetSummary } from '@/lib/types';

type SetRow = { id: string; title: string; description: string; createdAt: string; updatedAt: string; ownerId: string };
type ItemRow = { id: string; studySetId: string; question: string; answer: string; explanation: string; itemOrder: number };
type OptionRow = { id: string; studyItemId: string; content: string; isCorrect: number; optionOrder: number };
type ProgressRow = { id: string; studySetId: string; studyItemId: string; status: ProgressStatus; correctCount: number; incorrectCount: number; learningScore: number; lastStudiedAt: string | null };

const vietnameseKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');

export async function listSets(search = '', sort = 'updated'): Promise<StudySetSummary[]> {
  const result = await getDatabase().prepare(`SELECT s.id, s.title, s.description, s.created_at AS createdAt, s.updated_at AS updatedAt, s.owner_id AS ownerId, COUNT(DISTINCT i.id) AS itemCount, SUM(CASE WHEN p.status = 'MASTERED' THEN 1 ELSE 0 END) AS masteredCount, SUM(CASE WHEN p.status = 'LEARNING' THEN 1 ELSE 0 END) AS learningCount, MAX(p.last_studied_at) AS lastStudiedAt FROM study_sets s LEFT JOIN study_items i ON i.study_set_id = s.id LEFT JOIN study_progress p ON p.study_item_id = i.id WHERE s.owner_id = ? GROUP BY s.id`).bind(DEFAULT_USER_ID).all<StudySetSummary>();
  const key = vietnameseKey(search.trim());
  const rows = (result.results ?? []).filter((set) => !key || vietnameseKey(`${set.title} ${set.description}`).includes(key));
  rows.sort((a, b) => sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : sort === 'name' ? a.title.localeCompare(b.title, 'vi') : sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt));
  return rows.map((row) => ({ ...row, itemCount: Number(row.itemCount), masteredCount: Number(row.masteredCount), learningCount: Number(row.learningCount) }));
}

export async function getSet(id: string): Promise<StudySet | null> {
  const db = getDatabase();
  const set = await db.prepare(`SELECT id, title, description, created_at AS createdAt, updated_at AS updatedAt, owner_id AS ownerId FROM study_sets WHERE id = ? AND owner_id = ?`).bind(id, DEFAULT_USER_ID).first<SetRow>();
  if (!set) return null;
  const [itemResult, optionResult, progressResult] = await Promise.all([
    db.prepare(`SELECT id, study_set_id AS studySetId, question, answer, explanation, item_order AS itemOrder FROM study_items WHERE study_set_id = ? ORDER BY item_order`).bind(id).all<ItemRow>(),
    db.prepare(`SELECT o.id, o.study_item_id AS studyItemId, o.content, o.is_correct AS isCorrect, o.option_order AS optionOrder FROM study_options o JOIN study_items i ON i.id = o.study_item_id WHERE i.study_set_id = ? ORDER BY o.option_order`).bind(id).all<OptionRow>(),
    db.prepare(`SELECT id, study_set_id AS studySetId, study_item_id AS studyItemId, status, correct_count AS correctCount, incorrect_count AS incorrectCount, learning_score AS learningScore, last_studied_at AS lastStudiedAt FROM study_progress WHERE study_set_id = ?`).bind(id).all<ProgressRow>(),
  ]);
  const options = new Map<string, OptionRow[]>();
  for (const option of optionResult.results ?? []) options.set(option.studyItemId, [...(options.get(option.studyItemId) ?? []), option]);
  const progress = new Map((progressResult.results ?? []).map((entry) => [entry.studyItemId, entry]));
  const items: StudyItem[] = (itemResult.results ?? []).map((item) => {
    const saved = progress.get(item.id);
    return { id: item.id, studySetId: item.studySetId, question: item.question, answer: item.answer, explanation: item.explanation, order: item.itemOrder, options: (options.get(item.id) ?? []).map((option) => ({ id: option.id, content: option.content, isCorrect: Boolean(option.isCorrect), order: option.optionOrder })), progress: saved ? { id: saved.id, status: saved.status, correctCount: Number(saved.correctCount), incorrectCount: Number(saved.incorrectCount), learningScore: Number(saved.learningScore), lastStudiedAt: saved.lastStudiedAt } : { status: 'NEW', correctCount: 0, incorrectCount: 0, learningScore: 0, lastStudiedAt: null } };
  });
  return { ...set, items };
}

function itemStatements(db: D1Database, setId: string, items: EditableItem[], timestamp: string, existingIds = new Set<string>()) {
  const statements: D1PreparedStatement[] = [];
  items.forEach((item, index) => {
    const id = item.id && existingIds.has(item.id) ? item.id : createId('item');
    if (existingIds.has(id)) {
      statements.push(db.prepare(`UPDATE study_items SET question = ?, answer = ?, explanation = ?, item_order = ?, updated_at = ? WHERE id = ? AND study_set_id = ?`).bind(item.question.trim(), item.answer.trim(), item.explanation?.trim() ?? '', index, timestamp, id, setId));
      statements.push(db.prepare(`DELETE FROM study_options WHERE study_item_id = ?`).bind(id));
    } else {
      statements.push(db.prepare(`INSERT INTO study_items (id, study_set_id, question, answer, explanation, created_at, updated_at, item_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, setId, item.question.trim(), item.answer.trim(), item.explanation?.trim() ?? '', timestamp, timestamp, index));
    }
    (item.options ?? []).forEach((option, optionIndex) => statements.push(db.prepare(`INSERT INTO study_options (id, study_item_id, content, is_correct, option_order) VALUES (?, ?, ?, ?, ?)`).bind(createId('opt'), id, option.content.trim(), option.isCorrect ? 1 : 0, optionIndex)));
  });
  return statements;
}

async function executeBatches(db: D1Database, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 75) await db.batch(statements.slice(index, index + 75));
}

export async function createSet(title: string, description: string, items: EditableItem[]): Promise<StudySet> {
  const db = getDatabase();
  const id = createId('set');
  const now = new Date().toISOString();
  try {
    await executeBatches(db, [db.prepare(`INSERT OR IGNORE INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)`).bind(DEFAULT_USER_ID, 'Minh Vũ', 'local@memostudy.app', now), db.prepare(`INSERT INTO study_sets (id, title, description, created_at, updated_at, owner_id) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, title.trim(), description.trim(), now, now, DEFAULT_USER_ID), ...itemStatements(db, id, items, now)]);
  } catch (error) {
    await db.prepare(`DELETE FROM study_sets WHERE id = ?`).bind(id).run().catch(() => undefined);
    throw error;
  }
  return (await getSet(id))!;
}

export async function updateSet(id: string, title: string, description: string, items: EditableItem[]): Promise<StudySet | null> {
  const current = await getSet(id);
  if (!current) return null;
  const db = getDatabase();
  const now = new Date().toISOString();
  const existingIds = new Set(current.items.map((item) => item.id));
  const keptIds = new Set(items.flatMap((item) => item.id && existingIds.has(item.id) ? [item.id] : []));
  const statements: D1PreparedStatement[] = [db.prepare(`UPDATE study_sets SET title = ?, description = ?, updated_at = ? WHERE id = ? AND owner_id = ?`).bind(title.trim(), description.trim(), now, id, DEFAULT_USER_ID)];
  for (const existingId of existingIds) if (!keptIds.has(existingId)) statements.push(db.prepare(`DELETE FROM study_items WHERE id = ? AND study_set_id = ?`).bind(existingId, id));
  statements.push(...itemStatements(db, id, items, now, existingIds));
  await executeBatches(db, statements);
  return getSet(id);
}

export async function deleteSet(id: string) { const result = await getDatabase().prepare(`DELETE FROM study_sets WHERE id = ? AND owner_id = ?`).bind(id, DEFAULT_USER_ID).run(); return result.meta.changes > 0; }
export async function duplicateSet(id: string) { const source = await getSet(id); return source ? createSet(`${source.title} (bản sao)`, source.description, source.items.map((item) => ({ question: item.question, answer: item.answer, explanation: item.explanation, options: item.options }))) : null; }
export async function deleteItem(id: string) { const db = getDatabase(); const item = await db.prepare(`SELECT study_set_id AS studySetId FROM study_items WHERE id = ?`).bind(id).first<{ studySetId: string }>(); if (!item) return false; await db.batch([db.prepare(`DELETE FROM study_items WHERE id = ?`).bind(id), db.prepare(`UPDATE study_sets SET updated_at = ? WHERE id = ?`).bind(new Date().toISOString(), item.studySetId)]); return true; }
export async function resetProgress(setId: string) { const result = await getDatabase().prepare(`DELETE FROM study_progress WHERE study_set_id = ?`).bind(setId).run(); return Number(result.meta.changes); }

export async function updateProgress(setId: string, itemId: string, action: 'correct' | 'incorrect' | 'mastered' | 'learning' | 'new') {
  const db = getDatabase();
  if (!await db.prepare(`SELECT id FROM study_items WHERE id = ? AND study_set_id = ?`).bind(itemId, setId).first()) return null;
  const current = await db.prepare(`SELECT id, status, correct_count AS correctCount, incorrect_count AS incorrectCount, learning_score AS learningScore, last_studied_at AS lastStudiedAt FROM study_progress WHERE study_item_id = ?`).bind(itemId).first<ProgressRow>();
  const correctCount = Number(current?.correctCount ?? 0) + (action === 'correct' || action === 'mastered' ? 1 : 0);
  const incorrectCount = Number(current?.incorrectCount ?? 0) + (action === 'incorrect' || action === 'learning' ? 1 : 0);
  const learningScore = action === 'correct' || action === 'mastered' ? Number(current?.learningScore ?? 0) + 1 : action === 'incorrect' || action === 'learning' ? 0 : 0;
  const status: ProgressStatus = action === 'new' ? 'NEW' : action === 'mastered' || learningScore >= 2 ? 'MASTERED' : 'LEARNING';
  const now = new Date().toISOString();
  const progressId = current?.id ?? createId('progress');
  await db.batch([db.prepare(`INSERT INTO study_progress (id, study_set_id, study_item_id, status, correct_count, incorrect_count, learning_score, last_studied_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(study_item_id) DO UPDATE SET status = excluded.status, correct_count = excluded.correct_count, incorrect_count = excluded.incorrect_count, learning_score = excluded.learning_score, last_studied_at = excluded.last_studied_at`).bind(progressId, setId, itemId, status, correctCount, incorrectCount, learningScore, now), db.prepare(`UPDATE study_sets SET updated_at = ? WHERE id = ?`).bind(now, setId)]);
  return { id: progressId, status, correctCount, incorrectCount, learningScore, lastStudiedAt: now };
}

export async function saveSession(input: { studySetId: string; mode: 'FLASHCARDS' | 'LEARN' | 'TEST'; startedAt?: string; correctAnswers: number; incorrectAnswers: number; totalAnswers: number }) { const id = createId('session'); const now = new Date().toISOString(); await getDatabase().prepare(`INSERT INTO study_sessions (id, study_set_id, mode, started_at, completed_at, correct_answers, incorrect_answers, total_answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, input.studySetId, input.mode, input.startedAt ?? now, now, input.correctAnswers, input.incorrectAnswers, input.totalAnswers).run(); return { id, completedAt: now }; }

export async function statistics() {
  const db = getDatabase();
  const totals = await db.prepare(`SELECT COUNT(DISTINCT s.id) AS totalSets, COUNT(DISTINCT i.id) AS totalItems, SUM(CASE WHEN p.status = 'MASTERED' THEN 1 ELSE 0 END) AS mastered, SUM(CASE WHEN p.status = 'LEARNING' THEN 1 ELSE 0 END) AS learning FROM study_sets s LEFT JOIN study_items i ON i.study_set_id = s.id LEFT JOIN study_progress p ON p.study_item_id = i.id WHERE s.owner_id = ?`).bind(DEFAULT_USER_ID).first<{ totalSets: number; totalItems: number; mastered: number; learning: number }>();
  const today = new Date().toISOString().slice(0, 10);
  const activity = await db.prepare(`SELECT COALESCE(SUM(total_answers), 0) AS studied, COALESCE(SUM(correct_answers), 0) AS correct, COALESCE(SUM(incorrect_answers), 0) AS incorrect FROM study_sessions WHERE substr(completed_at, 1, 10) = ?`).bind(today).first<{ studied: number; correct: number; incorrect: number }>();
  const difficult = await db.prepare(`SELECT i.id, i.question, i.answer, s.title AS setTitle, p.incorrect_count AS incorrectCount FROM study_progress p JOIN study_items i ON i.id = p.study_item_id JOIN study_sets s ON s.id = i.study_set_id WHERE s.owner_id = ? AND p.incorrect_count > 0 ORDER BY p.incorrect_count DESC LIMIT 10`).bind(DEFAULT_USER_ID).all<{ id: string; question: string; answer: string; setTitle: string; incorrectCount: number }>();
  const totalItems = Number(totals?.totalItems ?? 0), mastered = Number(totals?.mastered ?? 0), learning = Number(totals?.learning ?? 0);
  return { totalSets: Number(totals?.totalSets ?? 0), totalItems, mastered, learning, newItems: Math.max(0, totalItems - mastered - learning), activity: { studied: Number(activity?.studied ?? 0), correct: Number(activity?.correct ?? 0), incorrect: Number(activity?.incorrect ?? 0) }, difficult: difficult.results ?? [] };
}
