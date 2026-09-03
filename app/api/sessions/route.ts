import { NextResponse } from 'next/server';
import { saveSession } from '@/lib/repository';
import { sessionSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const parsed = sessionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: 'Dữ liệu phiên học không hợp lệ.' }, { status: 400 });
    return NextResponse.json(await saveSession(parsed.data), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể lưu phiên học.' }, { status: 500 });
  }
}
