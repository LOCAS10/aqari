import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Local upload directory
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resourceType = (formData.get('resourceType') as string) || 'image';

    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });

    await ensureUploadDir();

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const ext = file.name.split('.').pop() || (file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'bin');
    const subfolder = resourceType === 'video' ? 'videos' : resourceType === 'audio' ? 'audios' : 'images';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const relativePath = `${subfolder}/${uniqueName}`;
    const fullPath = join(UPLOAD_DIR, subfolder);

    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
    }

    await writeFile(join(fullPath, uniqueName), buffer);

    const url = `/uploads/${relativePath}`;

    return NextResponse.json({ url, publicId: relativePath });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل الرفع' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { publicId } = await req.json();
    if (!publicId) return NextResponse.json({ error: 'معرف الملف مطلوب' }, { status: 400 });

    const { unlink } = await import('fs/promises');
    const filePath = join(UPLOAD_DIR, publicId);

    try {
      await unlink(filePath);
    } catch {
      // file may not exist
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}