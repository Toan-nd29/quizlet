'use client';

import { useEffect } from 'react';
import { api } from '@/lib/client-api';
import type { StudySet } from '@/lib/types';

type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => Promise<unknown> }, options?: { signal?: AbortSignal }) => void | Promise<void> };

export function WebMcpTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: 'create_study_set',
        title: 'Tạo bộ học MemoStudy',
        description: 'Tạo một bộ học mới, có thể kèm nhiều cặp câu hỏi và đáp án, rồi cập nhật thư viện đang hiển thị.',
        inputSchema: { type: 'object', properties: { title: { type: 'string', minLength: 1 }, description: { type: 'string' }, cards: { type: 'array', maxItems: 5000, items: { type: 'object', properties: { question: { type: 'string', minLength: 1 }, answer: { type: 'string', minLength: 1 }, explanation: { type: 'string' } }, required: ['question', 'answer'], additionalProperties: false } } }, required: ['title'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const value = input as { title?: string; description?: string; cards?: { question?: string; answer?: string; explanation?: string }[] };
          if (!value.title?.trim()) throw new Error('title là bắt buộc.');
          const cards = value.cards ?? [];
          if (cards.some((card) => !card.question?.trim() || !card.answer?.trim())) throw new Error('Mỗi card cần question và answer.');
          const created = await api<StudySet>('/api/sets', { method: 'POST', body: JSON.stringify({ title: value.title, description: value.description ?? '', items: cards }) });
          window.dispatchEvent(new CustomEvent('memostudy:data-changed'));
          return { id: created.id, title: created.title, cardCount: created.items.length, status: 'created' };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  return null;
}
