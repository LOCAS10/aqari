import { NextRequest, NextResponse } from 'next/server';
import { notification, dbReady } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady;
    const { id } = await params;
    const { notification: updatedNotification } = await notification.markRead({ where: { id } });
    if (!updatedNotification) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    return NextResponse.json({ notification: updatedNotification });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady;
    const { id } = await params;
    await notification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}