import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dataUrl, resourceType } = body;
    if (!dataUrl) {
      return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });
    }
    return NextResponse.json({ url: dataUrl, publicId: resourceType || 'upload' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل الرفع' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}