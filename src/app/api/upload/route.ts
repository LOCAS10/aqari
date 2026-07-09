import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resourceType = (formData.get('resourceType') as string) || 'image';

    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Cloudinary غير مهيأ' }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const type = resourceType === 'video' ? 'video' : resourceType === 'audio' ? 'raw' : 'image';

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(base64, {
        resource_type: type as any,
        folder: 'aqari',
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      duration: result.duration,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل الرفع' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { publicId, resourceType } = await req.json();

    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Cloudinary غير مهيأ' }, { status: 500 });
    }

    const type = resourceType === 'video' ? 'video' : resourceType === 'audio' ? 'raw' : 'image';

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, {
        resource_type: type as any,
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}