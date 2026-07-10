import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Allowed file types
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIOS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
  };
  return map[mimeType] || 'bin';
}

function getResourceDir(resourceType: string): string {
  if (resourceType === 'video') return 'videos';
  if (resourceType === 'audio') return 'audios';
  return 'images';
}

function getAllowedTypes(resourceType: string): string[] {
  if (resourceType === 'video') return ALLOWED_VIDEOS;
  if (resourceType === 'audio') return ALLOWED_AUDIOS;
  return ALLOWED_IMAGES;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resourceType = (formData.get('resourceType') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });
    }

    // Validate file type
    const allowed = getAllowedTypes(resourceType);
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `نوع الملف غير مدعوم: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `حجم الملف يتجاوز الحد المسموح (${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const ext = getExtension(file.type);
    const filename = `${randomUUID()}.${ext}`;
    const subdir = getResourceDir(resourceType);
    const uploadDir = join(process.cwd(), 'public', 'uploads', subdir);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return the URL path (served by /api/files/ route)
    const url = `/api/files/${subdir}/${filename}`;

    console.log(`[Upload] Saved ${resourceType}: ${url} (${buffer.length} bytes)`);

    return NextResponse.json({ url, name: file.name, size: buffer.length });
  } catch (e: any) {
    console.error('[Upload] Error:', e.message, e.stack);
    return NextResponse.json({ error: e.message || 'فشل في رفع الملف' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (url && url.startsWith('/api/files/')) {
      const relPath = url.replace('/api/files/', '');
      const filepath = join(process.cwd(), 'public', 'uploads', relPath);
      const { unlink } = await import('fs/promises');
      try { await unlink(filepath); } catch {}
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}