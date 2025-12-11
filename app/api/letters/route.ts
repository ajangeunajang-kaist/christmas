import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const ornamentId = formData.get('ornamentId') as string; // 오너먼트 ID 받기
    const ornamentName = formData.get('ornamentName') as string; // 오너먼트 이름 받기
    const text = formData.get('text') as string;
    const image = formData.get('image') as File | null;
    const objZip = formData.get('objZip') as File | null;
    const lowPolyImage = formData.get('lowPolyImage') as File | null;
    const podcast = formData.get('podcast') as File | null;
    const bgm = formData.get('bgm') as File | null;

    // ornamentId가 없으면 에러
    if (!ornamentId) {
      return NextResponse.json({ success: false, error: 'ornamentId is required' }, { status: 400 });
    }

    const timestamp = Date.now();

    // 기존 데이터 가져오기 (있으면)
    let existingData: any = {
      id: ornamentId,
      ornamentName: '',
      text: '',
      imageUrl: null,
      objZipUrl: null,
      lowPolyImageUrl: null,
      podcastUrl: null,
      bgmUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const existingBlob = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://' : ''}${process.env.VERCEL_URL || 'localhost:3000'}/api/letters/${ornamentId}`);
      if (existingBlob.ok) {
        const existing = await existingBlob.json();
        if (existing.success) {
          existingData = { ...existingData, ...existing.data };
        }
      }
    } catch (e) {
      // 기존 데이터 없음 - 새로 생성
    }

    // 이미지 업로드 (새로 업로드하면 덮어쓰기)
    let imageUrl = existingData.imageUrl;
    if (image) {
      const blob = await put(`images/${ornamentId}_${timestamp}_${image.name}`, image, {
        access: 'public',
      });
      imageUrl = blob.url;
    }

    // 3D 오브젝트 zip 파일 업로드
    let objZipUrl = existingData.objZipUrl;
    if (objZip) {
      const blob = await put(`3d-objects/${ornamentId}_${timestamp}_${objZip.name}`, objZip, {
        access: 'public',
        contentType: 'application/zip',
      });
      objZipUrl = blob.url;
    }

    // 로우폴리 이미지 업로드
    let lowPolyImageUrl = existingData.lowPolyImageUrl;
    if (lowPolyImage) {
      const blob = await put(`lowpoly-images/${ornamentId}_${timestamp}_${lowPolyImage.name}`, lowPolyImage, {
        access: 'public',
      });
      lowPolyImageUrl = blob.url;
    }

    // 팟캐스트 음성 파일 업로드
    let podcastUrl = existingData.podcastUrl;
    if (podcast) {
      const blob = await put(`podcasts/${ornamentId}_${timestamp}_${podcast.name}`, podcast, {
        access: 'public',
        contentType: 'audio/wav',
      });
      podcastUrl = blob.url;
    }

    // BGM 음악 파일 업로드
    let bgmUrl = existingData.bgmUrl;
    if (bgm) {
      const blob = await put(`bgm/${ornamentId}_${timestamp}_${bgm.name}`, bgm, {
        access: 'public',
        contentType: 'audio/wav',
      });
      bgmUrl = blob.url;
    }

    // 텍스트와 오너먼트 이름 업데이트 (새로 입력하면 덮어쓰기)
    const updatedText = text || existingData.text;
    const updatedOrnamentName = ornamentName || existingData.ornamentName;

    // 업데이트된 데이터
    const letterData = {
      ...existingData,
      id: ornamentId,
      ornamentName: updatedOrnamentName,
      text: updatedText,
      imageUrl,
      objZipUrl,
      lowPolyImageUrl,
      podcastUrl,
      bgmUrl,
      updatedAt: new Date().toISOString()
    };

    // JSON으로 저장
    await put(`letters/${ornamentId}.json`, JSON.stringify(letterData), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true, data: letterData });
  } catch (error) {
    console.error('Upload error:', error);
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