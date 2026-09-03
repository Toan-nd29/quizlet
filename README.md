# MemoStudy

MemoStudy là web application học bằng Flashcard với giao diện tiếng Việt, gồm CRUD bộ học/câu hỏi, import TXT/CSV/XLSX, Flashcards, Learn loop, Test mode và thống kê tiến độ bền vững.

## Kiến trúc

- UI: React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, Lucide.
- Runtime: Vinext (Next.js App Router tương thích) và API Route Handlers.
- Database: Cloudflare D1 (SQLite) với Drizzle schema/migration. Dữ liệu local nằm trong `.wrangler/`.
- Validation: Zod ở biên API.
- Import: PapaParse cho CSV và SheetJS cho XLSX.
- `prisma/schema.prisma` là schema Prisma tương đương để thuận tiện chuyển sang SQLite/PostgreSQL trong môi trường Node truyền thống; runtime Sites dùng D1/Drizzle vì D1 không dùng kết nối TCP.

Các phần chính nằm trong `app/` (routes + API), `components/` (UI theo tính năng), `lib/` (validation, repository, thuật toán/import) và `db/` (schema).

## Chạy local

Yêu cầu Node.js 22.13 trở lên.

```bash
npm install
npm run db:migrate:local
npm run dev
```

Mở `http://localhost:3000`. Ở terminal khác, tạo dữ liệu mẫu:

```bash
npm run db:seed
```

File `.env.example` liệt kê biến dùng khi chạy theo Prisma/Node. Bản chạy D1 local không cần secret.

## Database và migration

Sửa `db/schema.ts`, sau đó tạo migration mới:

```bash
npm run db:generate
```

Áp dụng migration vào D1 local:

```bash
npm run db:migrate:local
```

Các migration production trong `drizzle/` được Sites áp dụng theo từng phiên bản khi publish. Không sửa migration đã được áp dụng; hãy tạo migration mới.

## Import

Trang `/import` hỗ trợ copy/paste `Question<TAB>Answer`, CSV và XLSX có ghép cột. File mẫu có tại:

- `/samples/memostudy-import.csv`
- `/samples/memostudy-import.xlsx`

Dòng thiếu câu hỏi/đáp án hoặc bị trùng được đánh dấu và bỏ qua sau khi người dùng xác nhận.

## Kiểm tra chất lượng

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

`npm run smoke` chạy kiểm tra tích hợp CRUD/progress với dev server đang chạy.
