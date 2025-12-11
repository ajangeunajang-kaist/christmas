import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const image = formData.get('image') as File | null;

    // 이미지 저장
    let imagePath = null;
    if (image) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // public/uploads 폴더에 저장
      const filename = `${Date.now()}_${image.name}`;
      imagePath = `/uploads/${filename}`;
      await writeFile(
        path.join(process.cwd(), 'public', 'uploads', filename),
        buffer
      );
    }

    // JSON 파일로 저장 (또는 DB)
    const letterData = {
      id: Date.now(),
      text,
      imagePath,
      timestamp: new Date().toISOString()
    };

    await writeFile(
      path.join(process.cwd(), 'data', `letter_${letterData.id}.json`),
      JSON.stringify(letterData, null, 2)
    );

    return NextResponse.json({ success: true, data: letterData });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}