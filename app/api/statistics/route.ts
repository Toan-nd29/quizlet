import { NextResponse } from 'next/server';
import { statistics } from '@/lib/repository';

export async function GET() {
  try { return NextResponse.json(await statistics()); }
  catch (error) { console.error(error); return NextResponse.json({ message: 'Không thể tải thống kê.' }, { status: 500 }); }
}
