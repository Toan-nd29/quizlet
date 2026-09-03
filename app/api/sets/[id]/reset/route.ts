import { NextResponse } from 'next/server';
import { getSet, resetProgress } from '@/lib/repository';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!await getSet(id)) return NextResponse.json({ message: 'Không tìm thấy bộ học.' }, { status: 404 });
    return NextResponse.json({ ok: true, removed: await resetProgress(id) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể đặt lại tiến độ.' }, { status: 500 });
  }
}
