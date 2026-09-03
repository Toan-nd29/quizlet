const endpoint = process.env.MEMOSTUDY_URL ?? 'http://localhost:3000';

try {
  const response = await fetch(`${endpoint}/api/seed`, { method: 'POST' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Không thể seed dữ liệu.');
  console.log(data.seeded ? 'Đã tạo dữ liệu mẫu MemoStudy.' : 'Database đã có dữ liệu; không seed lại.');
} catch (error) {
  console.error('Không kết nối được với MemoStudy. Hãy chạy npm run dev trước.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
