/**
 * Vercel Blob 데이터 정리 스크립트
 * 특정 ornamentId들을 제외하고 나머지 삭제
 */

const { list, del } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// .env.local 파일 읽기
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found');
  }

  const envFile = fs.readFileSync(envPath, 'utf8');
  const lines = envFile.split('\n');

  for (const line of lines) {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  }
}

loadEnv();

// 유지할 ornamentId 목록 (여기에 추가하세요)
const KEEP_IDS = [
  "ornament_1765809199791_g5d2tabla",
  "ornament_1765803109037_h0csus9x7",
  "ornament_1765736454433_wtn842iha",
  "ornament_1765804062175_v6icxk67c",
  "ornament_1765810669345_980xlkts5",
];

async function cleanupBlobs() {
  try {
    const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ||
                       process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
                       process.env.BLOB_TOKEN;

    if (!BLOB_TOKEN) {
      throw new Error('BLOB_TOKEN is not set in .env.local');
    }

    console.log('🔍 Fetching all blobs...');
    const { blobs } = await list({ token: BLOB_TOKEN });
    console.log(`📦 Found ${blobs.length} total blobs`);

    const blobsToDelete = [];
    const blobsToKeep = [];

    for (const blob of blobs) {
      // letters/ornamentId.json 형식에서 ornamentId 추출
      const match = blob.pathname.match(/letters\/(.+)\.json$/);

      if (match) {
        const ornamentId = match[1];

        if (KEEP_IDS.includes(ornamentId)) {
          blobsToKeep.push(blob.pathname);
          console.log(`✅ Keeping: ${blob.pathname}`);
        } else {
          blobsToDelete.push(blob.url);
          console.log(`❌ Will delete: ${blob.pathname}`);
        }
      } else {
        // letters 폴더가 아닌 다른 파일들 처리
        // images, 3d-assets, podcasts, bgm 폴더의 파일들도 확인
        const shouldKeep = KEEP_IDS.some(id => blob.pathname.includes(id));

        if (shouldKeep) {
          blobsToKeep.push(blob.pathname);
          console.log(`✅ Keeping: ${blob.pathname}`);
        } else {
          blobsToDelete.push(blob.url);
          console.log(`❌ Will delete: ${blob.pathname}`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Blobs to keep: ${blobsToKeep.length}`);
    console.log(`   ❌ Blobs to delete: ${blobsToDelete.length}`);

    if (blobsToDelete.length === 0) {
      console.log('\n✨ No blobs to delete!');
      return;
    }

    // 확인 메시지
    console.log('\n⚠️  WARNING: This will permanently delete the blobs listed above!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting blobs...');

    // Vercel Blob의 del 함수는 URL 배열을 받음
    await del(blobsToDelete, { token: BLOB_TOKEN });

    console.log(`\n✅ Successfully deleted ${blobsToDelete.length} blobs!`);
    console.log(`✅ Kept ${blobsToKeep.length} blobs.`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// 스크립트 실행
cleanupBlobs();