// Script to manually update asset3dUrl for ornament
const fs = require('fs');
const { put, list } = require('@vercel/blob');

// Load .env.local manually
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const ORNAMENT_ID = 'ornament_1765854856916_flbkims9k';
const REFINE_TASK_ID = '019b2528-d4e3-7447-8f9b-9e57083661eb';

async function fixAsset3dUrl() {
  try {
    const apiKey = process.env.MESHY_API_KEY;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_TOKEN;

    if (!apiKey) {
      console.error('❌ MESHY_API_KEY not found');
      return;
    }

    if (!blobToken) {
      console.error('❌ BLOB_TOKEN not found');
      return;
    }

    console.log('🔍 Checking Meshy task status...');

    // 1. Meshy API에서 task 상태 확인
    const statusResponse = await fetch(
      `https://api.meshy.ai/v2/text-to-3d/${REFINE_TASK_ID}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      console.error('❌ Failed to check task status:', statusResponse.status);
      return;
    }

    const status = await statusResponse.json();
    console.log('📊 Task status:', JSON.stringify(status, null, 2));

    if (status.status !== 'SUCCEEDED') {
      console.error('❌ Task not succeeded yet:', status.status);
      return;
    }

    if (!status.model_urls?.glb) {
      console.error('❌ No GLB URL in response');
      console.log('Available URLs:', status.model_urls);
      return;
    }

    console.log('✅ GLB URL found:', status.model_urls.glb);

    // 2. GLB 파일 다운로드
    console.log('⬇️ Downloading GLB file...');
    const glbResponse = await fetch(status.model_urls.glb);
    if (!glbResponse.ok) {
      console.error('❌ Failed to download GLB:', glbResponse.status);
      return;
    }

    const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());
    console.log('✅ GLB downloaded, size:', glbBuffer.length, 'bytes');

    // 3. Vercel Blob에 업로드
    console.log('📤 Uploading to Vercel Blob...');
    const timestamp = Date.now();
    const blob = await put(
      `3d-assets/${REFINE_TASK_ID}_${timestamp}.glb`,
      glbBuffer,
      {
        access: 'public',
        contentType: 'model/gltf-binary',
        allowOverwrite: true,
        token: blobToken,
      }
    );

    console.log('✅ 3D asset uploaded:', blob.url);

    // 4. Letter data 가져오기
    console.log('📦 Fetching letter data...');
    const { blobs } = await list({
      prefix: `letters/${ORNAMENT_ID}.json`,
      token: blobToken,
    });

    if (blobs.length === 0) {
      console.error('❌ Letter data not found');
      return;
    }

    const letterBlob = blobs[0];
    const letterResponse = await fetch(letterBlob.url);
    const letterData = await letterResponse.json();
    console.log('📄 Current letter data:', JSON.stringify(letterData, null, 2));

    // 5. Letter data 업데이트
    const updatedLetterData = {
      ...letterData,
      asset3dUrl: blob.url,
      updatedAt: new Date().toISOString(),
    };

    console.log('💾 Updating letter data...');
    await put(`letters/${ORNAMENT_ID}.json`, JSON.stringify(updatedLetterData), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      token: blobToken,
    });

    console.log('✅ Letter data updated successfully!');
    console.log('📝 New asset3dUrl:', blob.url);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAsset3dUrl();
