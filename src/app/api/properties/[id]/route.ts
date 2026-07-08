import { NextRequest, NextResponse } from 'next/server';
import { property } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await property.findUnique({
      where: { id },
      include: { inquiries: true },
    });
    if (!result) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    const updatable = ['title','description','propertyType','transactionType','price','area',
      'location','city','address','rooms','bathrooms','floor','status','contactPhone'];
    for (const key of updatable) {
      if (body[key] !== undefined) {
        data[key] = key === 'price' || key === 'area' || key === 'rooms' || key === 'bathrooms' || key === 'floor'
          ? (body[key] ? parseFloat(body[key]) : null) : body[key];
      }
    }
    if (body.features !== undefined) data.features = JSON.stringify(body.features);
    if (body.images !== undefined) data.images = JSON.stringify(body.images);
    if (body.videos !== undefined) data.videos = JSON.stringify(body.videos);
    if (body.audios !== undefined) data.audios = JSON.stringify(body.audios);

    const { property } = await property.update({ where: { id }, data });
    return NextResponse.json({ property });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await property.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}