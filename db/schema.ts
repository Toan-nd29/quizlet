import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('idx_users_email').on(table.email)]);

export const studySets = sqliteTable('study_sets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [index('idx_study_sets_owner_updated').on(table.ownerId, table.updatedAt)]);

export const studyItems = sqliteTable('study_items', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  explanation: text('explanation').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  order: integer('item_order').notNull(),
}, (table) => [
  index('idx_study_items_set_order').on(table.studySetId, table.order),
  index('idx_study_items_set_question').on(table.studySetId, table.question),
]);

export const studyOptions = sqliteTable('study_options', {
  id: text('id').primaryKey(),
  studyItemId: text('study_item_id').notNull().references(() => studyItems.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
  order: integer('option_order').notNull(),
}, (table) => [index('idx_study_options_item_order').on(table.studyItemId, table.order)]);

export const studyProgress = sqliteTable('study_progress', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  studyItemId: text('study_item_id').notNull().references(() => studyItems.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['NEW', 'LEARNING', 'MASTERED'] }).notNull().default('NEW'),
  correctCount: integer('correct_count').notNull().default(0),
  incorrectCount: integer('incorrect_count').notNull().default(0),
  learningScore: integer('learning_score').notNull().default(0),
  lastStudiedAt: text('last_studied_at'),
}, (table) => [
  uniqueIndex('idx_study_progress_item_unique').on(table.studyItemId),
  index('idx_study_progress_set_status').on(table.studySetId, table.status),
  index('idx_study_progress_incorrect').on(table.studySetId, table.incorrectCount),
]);

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  mode: text('mode', { enum: ['FLASHCARDS', 'LEARN', 'TEST'] }).notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  correctAnswers: integer('correct_answers').notNull().default(0),
  incorrectAnswers: integer('incorrect_answers').notNull().default(0),
  totalAnswers: integer('total_answers').notNull().default(0),
}, (table) => [index('idx_study_sessions_set_started').on(table.studySetId, table.startedAt)]);
