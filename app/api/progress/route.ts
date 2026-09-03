import { NextResponse } from 'next/server';
import { updateProgress } from '@/lib/repository';
import { progressSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const parsed = progressSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: 'Dữ liệu tiến độ không hợp lệ.' }, { status: 400 });
    const progress = await updateProgress(parsed.data.studySetId, parsed.data.studyItemId, parsed.data.action);
    return progress ? NextResponse.json(progress) : NextResponse.json({ message: 'Không tìm thấy câu hỏi.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể lưu tiến độ.' }, { status: 500 });
  }
}
