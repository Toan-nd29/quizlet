export type TestQuestionData = {
  itemId: string;
  question: string;
  answer: string;
  explanation: string;
  type: 'multiple' | 'written';
  options: string[];
};

export type TestResultData = {
  setId: string;
  setTitle: string;
  completedAt: string;
  questions: TestQuestionData[];
  answers: Record<string, string>;
};
