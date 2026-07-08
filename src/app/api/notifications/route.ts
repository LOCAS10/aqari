import { NextRequest, NextResponse } from 'next/server';
import { notification, dbReady } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await dbReady;
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || '';
    const { notifications } = await notification.findMany({
      agentId: agentId || undefined,
    });
    return NextResponse.json({ notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbReady;
    const body = await req.json();
    if (!body.agentId || !body.title?.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال الوكيل والعنوان' }, { status: 400 });
    }
    const { notification: newNotification } = await notification.create({
      data: {
        agentId: body.agentId,
        title: body.title.trim(),
        message: body.message?.trim() || null,
        type: body.type || 'INFO',
      },
    });
    return NextResponse.json({ notification: newNotification });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}