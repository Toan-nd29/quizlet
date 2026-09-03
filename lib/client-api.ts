export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const data = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(data.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
  return data as T;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');

export const formatRelativeDate = (value: string | null) => {
  if (!value) return 'Chưa học';
  const date = new Date(value);
  const delta = Date.now() - date.getTime();
  const days = Math.floor(delta / 86_400_000);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};
