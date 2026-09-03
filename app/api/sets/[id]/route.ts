import { NextResponse } from 'next/server';
import { deleteSet, getSet, updateSet } from '@/lib/repository';
import { setSchema } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const set = await getSet(id);
    return set ? NextResponse.json(set) : NextResponse.json({ message: 'Không tìm thấy bộ học.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể tải bộ học.' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const parsed = setSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' }, { status: 400 });
    const { id } = await context.params;
    const set = await updateSet(id, parsed.data.title, parsed.data.description, parsed.data.items);
    return set ? NextResponse.json(set) : NextResponse.json({ message: 'Không tìm thấy bộ học.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể lưu thay đổi.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await deleteSet(id) ? NextResponse.json({ ok: true }) : NextResponse.json({ message: 'Không tìm thấy bộ học.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể xóa bộ học.' }, { status: 500 });
  }
}
