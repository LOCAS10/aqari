import { NextRequest, NextResponse } from 'next/server';
import { agent } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;

    const { agent: updatedAgent } = await agent.update({ where: { id }, data });
    if (!updatedAgent) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    return NextResponse.json({ agent: updatedAgent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await agent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}