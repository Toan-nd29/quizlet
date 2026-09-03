import { NextResponse } from 'next/server';
import { createSet, listSets } from '@/lib/repository';
import { setSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await listSets(url.searchParams.get('q') ?? '', url.searchParams.get('sort') ?? 'updated'));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể tải danh sách bộ học.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = setSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' }, { status: 400 });
    const set = await createSet(parsed.data.title, parsed.data.description, parsed.data.items);
    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể tạo bộ học.' }, { status: 500 });
  }
}
