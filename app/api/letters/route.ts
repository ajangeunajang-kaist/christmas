import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const image = formData.get('image') as File | null;

    // 이미지를 Vercel Blob에 업로드
    let imageUrl = null;
    if (image) {
      const blob = await put(`images/${Date.now()}_${image.name}`, image, {
        access: 'public',
      });
      imageUrl = blob.url;
    }

    // 텍스트 데이터도 JSON으로 Blob에 저장
    const letterData = {
      id: Date.now(),
      text,
      imageUrl,
      timestamp: new Date().toISOString()
    };

    await put(`letters/${letterData.id}.json`, JSON.stringify(letterData), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true, data: letterData });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}

// 모든 편지 가져오기
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'letters/' });
    
    const letters = await Promise.all(
      blobs.map(async (blob: any) => {
        const response = await fetch(blob.url);
        return response.json();
      })
    );

    return NextResponse.json({ success: true, data: letters });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}