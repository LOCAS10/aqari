import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const inquiries = await db.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: { property: { select: { id: true, title: true, propertyType: true } } },
    });
    return NextResponse.json({ inquiries });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inquiry = await db.inquiry.create({
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