import { env } from 'cloudflare:workers';

export function getDatabase(): D1Database {
  if (!env.DB) throw new Error('Không tìm thấy kết nối cơ sở dữ liệu.');
  return env.DB;
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export const DEFAULT_USER_ID = 'user_local_default';
