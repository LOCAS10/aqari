import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resourceType = (formData.get('resourceType') as string) || 'image';

    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });

    const subfolder = resourceType === 'video' ? 'videos' : resourceType === 'audio' ? 'audios' : 'images';
    const dirPath = path.join(UPLOAD_DIR, subfolder);
    ensureDir(dirPath);

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(dirPath, fileName);

    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${subfolder}/${fileName}`;
    return NextResponse.json({ url, publicId: `${subfolder}/${fileName}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل الرفع' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { publicId } = await req.json();
    if (!publicId) return NextResponse.json({ error: 'معرف الملف مطلوب' }, { status: 400 });

    const filePath = path.join(UPLOAD_DIR, publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}