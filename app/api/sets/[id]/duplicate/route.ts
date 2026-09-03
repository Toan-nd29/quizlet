import { NextResponse } from 'next/server';
import { duplicateSet } from '@/lib/repository';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const set = await duplicateSet(id);
    return set ? NextResponse.json(set, { status: 201 }) : NextResponse.json({ message: 'Không tìm thấy bộ học.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể nhân bản bộ học.' }, { status: 500 });
  }
}
