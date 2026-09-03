const base = process.env.MEMOSTUDY_URL ?? 'http://localhost:3000';
let createdId;
let bulkId;

async function request(path, init) {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${data.message ?? response.status}`);
  return data;
}

try {
  const created = await request('/api/sets', { method: 'POST', body: JSON.stringify({ title: `Smoke ${Date.now()}`, description: 'CRUD integration test', items: [{ question: '1 + 1 bằng mấy?', answer: '2', explanation: '', options: [] }, { question: 'Thủ đô Việt Nam?', answer: 'Hà Nội', explanation: '', options: [{ content: 'Hà Nội', isCorrect: true, order: 0 }, { content: 'Huế', isCorrect: false, order: 1 }] }] }) });
  createdId = created.id;
  if (created.items.length !== 2) throw new Error('Create did not persist two items.');
  const read = await request(`/api/sets/${createdId}`);
  const updated = await request(`/api/sets/${createdId}`, { method: 'PUT', body: JSON.stringify({ title: read.title, description: read.description, items: read.items.map((item, index) => ({ id: item.id, question: item.question, answer: index === 0 ? 'Hai' : item.answer, explanation: item.explanation, options: item.options })) }) });
  if (updated.items[0].answer !== 'Hai') throw new Error('Update did not persist.');
  const itemId = updated.items[0].id;
  await request('/api/progress', { method: 'POST', body: JSON.stringify({ studySetId: createdId, studyItemId: itemId, action: 'correct' }) });
  const progress = await request('/api/progress', { method: 'POST', body: JSON.stringify({ studySetId: createdId, studyItemId: itemId, action: 'correct' }) });
  if (progress.status !== 'MASTERED') throw new Error('Learning score did not reach MASTERED after two correct answers.');
  const bulk = await request('/api/sets', { method: 'POST', body: JSON.stringify({ title: `Bulk ${Date.now()}`, description: '100-row import simulation', items: Array.from({ length: 100 }, (_, index) => ({ question: `Câu hỏi ${index + 1}`, answer: `Đáp án ${index + 1}`, explanation: '', options: [] })) }) });
  bulkId = bulk.id;
  if (bulk.items.length !== 100) throw new Error('Bulk create did not persist 100 items.');
  console.log('Smoke test passed: create, read, update, 100-row bulk import, progress and delete.');
} finally {
  if (createdId) await request(`/api/sets/${createdId}`, { method: 'DELETE' }).catch(() => undefined);
  if (bulkId) await request(`/api/sets/${bulkId}`, { method: 'DELETE' }).catch(() => undefined);
}
