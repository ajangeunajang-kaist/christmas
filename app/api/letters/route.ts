import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const ornamentId = formData.get('ornamentId') as string;
    const ornamentName = formData.get('ornamentName') as string;
    const story = formData.get('story') as string;
    const image = formData.get('image') as File | null;
    const asset3d = formData.get('3dAsset') as File | null; // objZip → 3dAsset
    const podcast = formData.get('podcast') as File | null;
    const bgm = formData.get('bgm') as File | null;

    if (!ornamentId) {
      return NextResponse.json({ success: false, error: 'ornamentId is required' }, { status: 400 });
    }

    const timestamp = Date.now();

    let existingData: any = {
      id: ornamentId,
      ornamentName: '',
      story: '',
      imageUrl: null,
      asset3dUrl: null, // objZipUrl → asset3dUrl
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

    let imageUrl = existingData.imageUrl;
    if (image) {
      const blob = await put(`images/${ornamentId}_${timestamp}_${image.name}`, image, {
        access: 'public',
      });
      imageUrl = blob.url;
    }

    let asset3dUrl = existingData.asset3dUrl; // objZipUrl → asset3dUrl
    if (asset3d) {
      const blob = await put(`3d-assets/${ornamentId}_${timestamp}_${asset3d.name}`, asset3d, { // 3d-objects → 3d-assets
        access: 'public',
        contentType: 'model/gltf-binary', // application/zip → model/gltf-binary
      });
      asset3dUrl = blob.url;
    }

    let podcastUrl = existingData.podcastUrl;
    if (podcast) {
      const blob = await put(`podcasts/${ornamentId}_${timestamp}_${podcast.name}`, podcast, {
        access: 'public',
        contentType: 'audio/wav',
      });
      podcastUrl = blob.url;
    }

    let bgmUrl = existingData.bgmUrl;
    if (bgm) {
      const blob = await put(`bgm/${ornamentId}_${timestamp}_${bgm.name}`, bgm, {
        access: 'public',
        contentType: 'audio/wav',
      });
      bgmUrl = blob.url;
    }

    const updatedStory = story || existingData.story;
    const updatedOrnamentName = ornamentName || existingData.ornamentName;

    const letterData = {
      ...existingData,
      id: ornamentId,
      ornamentName: updatedOrnamentName,
      story: updatedStory,
      imageUrl,
      asset3dUrl, // objZipUrl → asset3dUrl
      podcastUrl,
      bgmUrl,
      updatedAt: new Date().toISOString()
    };

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