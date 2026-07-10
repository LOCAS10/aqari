import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

const MAX_AGE = 365 * 24 * 60 * 60; // 1 year cache

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = join(process.cwd(), 'public', 'uploads', ...pathSegments);

    // Security: prevent directory traversal
    const resolved = join(process.cwd(), 'public', 'uploads');
    if (!filePath.startsWith(resolved)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check file exists
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Read file
    const buffer = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': `public, max-age=${MAX_AGE}, immutable`,
        'Content-Disposition': `inline; filename="${pathSegments[pathSegments.length - 1]}"`,
      },
    });
  } catch (e: any) {
    console.error('[Files] Error:', e.message);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}