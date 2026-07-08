import { NextRequest, NextResponse } from 'next/server';
import { property, inquiry } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '';
    const transaction = searchParams.get('transaction') || '';
    const status = searchParams.get('status') || '';
    const city = searchParams.get('city') || '';
    const search = searchParams.get('search') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minArea = searchParams.get('minArea');

    const where: any = {};
    if (type) where.propertyType = type;
    if (transaction) where.transactionType = transaction;
    if (status) where.status = status;
    if (city) where.city = { contains: city };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { address: { contains: search } },
        { location: { contains: search } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (minArea) where.area = { gte: parseFloat(minArea) };

    const { properties } = await property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { inquiries: true } },
    });

    return NextResponse.json({ properties });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { property } = await property.create({
      data: {
        title: body.title,
        description: body.description || null,
        propertyType: body.propertyType || 'APARTMENT',
        transactionType: body.transactionType || 'SALE',
        price: parseFloat(body.price) || 0,
        area: body.area ? parseFloat(body.area) : null,
        location: body.location || null,
        city: body.city || null,
        address: body.address || null,
        rooms: body.rooms ? parseInt(body.rooms) : null,
        bathrooms: body.bathrooms ? parseInt(body.bathrooms) : null,
        floor: body.floor ? parseInt(body.floor) : null,
        features: body.features ? JSON.stringify(body.features) : null,
        status: body.status || 'AVAILABLE',
        images: body.images ? JSON.stringify(body.images) : null,
        videos: body.videos ? JSON.stringify(body.videos) : null,
        audios: body.audios ? JSON.stringify(body.audios) : null,
        contactPhone: body.contactPhone || null,
        agentId: body.agentId || null,
      },
    });
    return NextResponse.json({ property });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}