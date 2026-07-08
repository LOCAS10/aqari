import { NextRequest, NextResponse } from 'next/server';
import { query, dbReady } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await dbReady;
    const body = await req.json();
    const pin = String(body.pin || '').trim();

    if (!pin) {
      return NextResponse.json({ error: 'يرجى إدخال الرمز السري' }, { status: 400 });
    }

    const result = await query('SELECT id, name, phone, pin FROM Agent WHERE pin = ?', [pin]);

    if (!result.rows.length) {
      return NextResponse.json({ error: 'رمز سري غير صحيح' }, { status: 401 });
    }

    const agent = result.rows[0];
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}