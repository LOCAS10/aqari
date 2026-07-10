import { NextRequest, NextResponse } from 'next/server';
import { property, inquiry, dbReady } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await dbReady;
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
    console.error('[POST /api/properties] GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbReady;

    // Parse body with detailed error logging
    let body: any;
    try {
      body = await req.json();
    } catch (parseErr: any) {
      console.error('[POST /api/properties] Failed to parse request body:', parseErr.message);
      return NextResponse.json(
        { error: 'فشل في قراءة البيانات المرسلة', details: parseErr.message },
        { status: 400 }
      );
    }

    console.log('[POST /api/properties] Received:', {
      title: body.title,
      propertyType: body.propertyType,
      transactionType: body.transactionType,
      price: body.price,
      hasImages: Array.isArray(body.images) && body.images.length > 0,
      imagesCount: Array.isArray(body.images) ? body.images.length : 0,
      imagesTotalSize: Array.isArray(body.images) ? body.images.reduce((s: number, i: string) => s + (i?.length || 0), 0) : 0,
    });

    // Ensure title is not empty (DB requires NOT NULL)
    const title = body.title?.trim() || 'عقار';

    const { property: createdProperty } = await property.create({
      data: {
        title,
        description: body.description || null,
        propertyType: body.propertyType || 'APARTMENT',
        transactionType: body.transactionType || 'SALE',
        price: parseFloat(body.price) || 0,
        area: body.area != null ? parseFloat(body.area) : null,
        location: body.location || null,
        city: body.city || null,
        address: body.address || null,
        rooms: body.rooms != null ? parseInt(body.rooms) : null,
        bathrooms: body.bathrooms != null ? parseInt(body.bathrooms) : null,
        floor: body.floor != null ? parseInt(body.floor) : null,
        features: body.features ? JSON.stringify(body.features) : null,
        status: body.status || 'AVAILABLE',
        images: body.images && body.images.length > 0 ? JSON.stringify(body.images) : null,
        videos: body.videos && body.videos.length > 0 ? JSON.stringify(body.videos) : null,
        audios: body.audios && body.audios.length > 0 ? JSON.stringify(body.audios) : null,
        contactPhone: body.contactPhone || null,
        agentId: body.agentId || null,
      },
    });

    console.log('[POST /api/properties] Created successfully:', createdProperty.id);
    return NextResponse.json({ property: createdProperty });
  } catch (e: any) {
    console.error('[POST /api/properties] Error:', e.message, e.stack);
    return NextResponse.json({ error: e.message, details: 'حدث خطأ أثناء حفظ العقار' }, { status: 500 });
  }
}