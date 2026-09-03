import { NextResponse } from 'next/server';
import { createSet, listSets } from '@/lib/repository';
import { englishItems, historyItems } from '@/lib/seed-data';

export async function POST() {
  try {
    const current = await listSets();
    if (current.length > 0) return NextResponse.json({ seeded: false, sets: current });
    const history = await createSet('Lịch sử Đảng – Ôn tập', 'Các dấu mốc, hội nghị và đường lối quan trọng.', historyItems);
    const english = await createSet('Tiếng Anh giao tiếp', 'Từ vựng và mẫu câu dùng trong đời sống hằng ngày.', englishItems);
    return NextResponse.json({ seeded: true, sets: [history, english] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể tạo dữ liệu mẫu.' }, { status: 500 });
  }
}
