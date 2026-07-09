import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resourceType = (formData.get('resourceType') as string) || 'image';
    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl, publicId: resourceType });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل الرفع' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}