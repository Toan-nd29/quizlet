export type ProgressStatus = 'NEW' | 'LEARNING' | 'MASTERED';

export type StudyOption = { id?: string; content: string; isCorrect: boolean; order: number };
export type StudyProgress = { id?: string; status: ProgressStatus; correctCount: number; incorrectCount: number; learningScore: number; lastStudiedAt: string | null };
export type StudyItem = { id: string; studySetId: string; question: string; answer: string; explanation: string; order: number; options: StudyOption[]; progress: StudyProgress };
export type StudySet = { id: string; title: string; description: string; createdAt: string; updatedAt: string; ownerId: string; items: StudyItem[] };
export type StudySetSummary = Omit<StudySet, 'items'> & { itemCount: number; masteredCount: number; learningCount: number; lastStudiedAt: string | null };
export type EditableItem = { id?: string; question: string; answer: string; explanation?: string; options?: StudyOption[] };
