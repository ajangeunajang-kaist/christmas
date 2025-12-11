import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const image = formData.get('image') as File | null;
    const objZip = formData.get('objZip') as File | null;
    const lowPolyImage = formData.get('lowPolyImage') as File | null;
    const podcast = formData.get('podcast') as File | null;
    const bgm = formData.get('bgm') as File | null;

    const timestamp = Date.now();

    // 이미지를 Vercel Blob에 업로드
    let imageUrl = null;
    if (image) {
      const blob = await put(`images/${timestamp}_${image.name}`, image, {
        access: 'public',
      });
      imageUrl = blob.url;
    }

    // 3D 오브젝트 zip 파일 업로드
    let objZipUrl = null;
    if (objZip) {
      const blob = await put(`3d-objects/${timestamp}_${objZip.name}`, objZip, {
        access: 'public',
        contentType: 'application/zip',
      });
      objZipUrl = blob.url;
    }

    // 로우폴리 이미지 업로드
    let lowPolyImageUrl = null;
    if (lowPolyImage) {
      const blob = await put(`lowpoly-images/${timestamp}_${lowPolyImage.name}`, lowPolyImage, {
        access: 'public',
      });
      lowPolyImageUrl = blob.url;
    }

    // 팟캐스트 음성 파일 업로드
    let podcastUrl = null;
    if (podcast) {
      const blob = await put(`podcasts/${timestamp}_${podcast.name}`, podcast, {
        access: 'public',
        contentType: 'audio/wav',
      });
      podcastUrl = blob.url;
    }

    // BGM 음악 파일 업로드
    let bgmUrl = null;
    if (bgm) {
      const blob = await put(`bgm/${timestamp}_${bgm.name}`, bgm, {
        access: 'public',
        contentType: 'audio/wav',
      });
      bgmUrl = blob.url;
    }

    // 텍스트 데이터도 JSON으로 Blob에 저장
    const letterData = {
      id: timestamp,
      text,
      imageUrl,
      objZipUrl,
      lowPolyImageUrl,
      podcastUrl,
      bgmUrl,
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