import { NextRequest, NextResponse } from 'next/server';
import { inquiry, dbReady } from '@/lib/db';

export async function GET() {
  try {
    await dbReady;
    const { inquiries } = await inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: { property: true, agent: true },
    });
    return NextResponse.json({ inquiries });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbReady;
    const body = await req.json();
    const { inquiry: createdInquiry } = await inquiry.create({
      data: {
        propertyId: body.propertyId || null,
        propertyType: body.propertyType || null,
        agentId: body.agentId || null,
        callerName: body.callerName,
        callerPhone: body.callerPhone,
        message: body.message || null,
        status: body.status || 'NEW',
        inquiryType: body.inquiryType || 'REQUEST',
        inquirySubType: body.inquirySubType || null,
      },
    });
    return NextResponse.json({ inquiry: createdInquiry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}