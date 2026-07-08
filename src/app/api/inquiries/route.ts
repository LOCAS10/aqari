import { NextRequest, NextResponse } from 'next/server';
import { inquiry } from '@/lib/db';

export async function GET() {
  try {
    const { inquiries } = await inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: { property: true },
    });
    return NextResponse.json({ inquiries });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inquiry } = await inquiry.create({
      data: {
        propertyId: body.propertyId,
        callerName: body.callerName,
        callerPhone: body.callerPhone,
        message: body.message || null,
        status: body.status || 'NEW',
      },
    });
    return NextResponse.json({ inquiry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}