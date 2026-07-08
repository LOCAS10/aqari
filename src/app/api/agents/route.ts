import { NextRequest, NextResponse } from 'next/server';
import { agent } from '@/lib/db';

export async function GET() {
  try {
    const { agents } = await agent.findMany();
    return NextResponse.json({ agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال اسم الوكيل' }, { status: 400 });
    }
    const { agent: newAgent } = await agent.create({
      data: {
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
      },
    });
    return NextResponse.json({ agent: newAgent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}