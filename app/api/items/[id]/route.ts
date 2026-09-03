import { NextResponse } from 'next/server';
import { deleteItem } from '@/lib/repository';

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return await deleteItem(id) ? NextResponse.json({ ok: true }) : NextResponse.json({ message: 'Không tìm thấy câu hỏi.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể xóa câu hỏi.' }, { status: 500 });
  }
}
