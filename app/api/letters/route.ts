import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

// Meshy API로 GLB 생성 함수 (Image to 3D)
async function generateGLBWithMeshy({ imageUrl }: { imageUrl: string }) {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) throw new Error("MESHY_API_KEY is not set");

  console.log("🚀 Creating Meshy task with image:", imageUrl);

  // 1. Task 생성
  const createResponse = await fetch("https://api.meshy.ai/openapi/v1/image-to-3d", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      ai_model: "meshy-5",
      topology: "triangle",
      target_polycount: 100, // 로우폴리 설정
      should_remesh: true,
      should_texture: true,
      enable_pbr: false, // 간단한 텍스처만 사용
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Meshy task creation failed: ${createResponse.status} ${errorText}`);
  }

  const taskData = await createResponse.json();
  console.log("📋 Meshy API response:", JSON.stringify(taskData, null, 2));
  const taskId = taskData.result || taskData.id || taskData.task_id;
  console.log("✅ Meshy task created:", taskId);

  if (!taskId) {
    throw new Error("No task ID in Meshy response");
  }

  // 2. Polling으로 task 완료 대기 (최대 10분)
  const maxAttempts = 120; // 10분 (5초 간격)
  const pollInterval = 5000; // 5초

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check task status: ${statusResponse.status}`);
    }

    const status = await statusResponse.json();
    console.log(`📊 Meshy task ${taskId} status: ${status.status} (${status.progress || 0}%)`);

    if (status.status === "SUCCEEDED") {
      console.log("🎉 Meshy task completed!");

      // 3. GLB URL에서 파일 다운로드
      const glbUrl = status.model_urls?.glb;
      if (!glbUrl) throw new Error("No GLB URL in response");

      console.log("⬇️ Downloading GLB from:", glbUrl);
      const glbRes = await fetch(glbUrl);
      if (!glbRes.ok) throw new Error("Failed to download GLB");

      const glbBuffer = Buffer.from(await glbRes.arrayBuffer());
      console.log("✅ GLB downloaded, size:", glbBuffer.length, "bytes");
      return glbBuffer;
    }

    if (status.status === "FAILED" || status.status === "CANCELED") {
      throw new Error(`Meshy task ${status.status}`);
    }

    // PENDING or IN_PROGRESS - continue polling
  }

  throw new Error("Meshy task timeout (10 minutes)");
}

// Support multiple env var names for the blob token (VERCEL UI vs local .env)
const BLOB_TOKEN: string | undefined = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_TOKEN || undefined;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const ornamentId = formData.get("ornamentId") as string;
    const ornamentName = formData.get("ornamentName") as string;
    const story = formData.get("story") as string;
    const podcastScript = formData.get("podcastScript") as string;
    const emotion = formData.get("emotion") as string;
    const imageUrlFromForm = formData.get("imageUrl") as string | null;
    const image = formData.get("image") as File | null;
    const asset3d = formData.get("3dAsset") as File | null;
    const podcast = formData.get("podcast") as File | null;
    const bgm = formData.get("bgm") as File | null;

    // 디버깅 로그 추가
    console.log("📥 Received formData:", {
      ornamentId,
      ornamentName,
      story,
      podcastScript,
      has3dAsset: !!asset3d,
      asset3dName: asset3d?.name,
      asset3dSize: asset3d?.size,
    });

    if (!ornamentId) {
      return NextResponse.json(
        { success: false, error: "ornamentId is required" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();

    let existingData: any = {
      id: ornamentId,
      ornamentName: "",
      story: "",
      podcastScript: "",
      emotion: "",
      imageUrl: null,
      asset3dUrl: null,
      podcastUrl: null,
      bgmUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const existingBlob = await fetch(
        `${BLOB_TOKEN ? "https://" : ""}${process.env.VERCEL_URL || "localhost:3000"}/api/letters/${ornamentId}`
      );
      if (existingBlob.ok) {
        const existing = await existingBlob.json();
        if (existing.success) {
          existingData = { ...existingData, ...existing.data };
        }
      }
    } catch (e) {
      console.log("No existing data found, creating new");
    }

    let imageUrl = existingData.imageUrl;
    if (image) {
      const blob = await put(
        `images/${ornamentId}_${timestamp}_${image.name}`,
        image,
        {
          access: "public",
          token: BLOB_TOKEN,
        }
      );
      imageUrl = blob.url;
      console.log("✅ Image uploaded:", imageUrl);
    } else if (imageUrlFromForm) {
      // formData에서 받은 imageUrl이 있으면 사용
      imageUrl = imageUrlFromForm;
      console.log("✅ Image URL from form:", imageUrl);
    }

    let asset3dUrl = existingData.asset3dUrl;
    if (asset3d) {
      console.log("🔄 Uploading 3D asset...");
      const blob = await put(
        `3d-assets/${ornamentId}_${timestamp}_${asset3d.name}`,
        asset3d,
        {
          access: "public",
          contentType: "model/gltf-binary",
          allowOverwrite: true,
          token: BLOB_TOKEN,
        }
      );
      asset3dUrl = blob.url;
      console.log("✅ 3D asset uploaded:", asset3dUrl);
    } else if (imageUrl) {
      // asset3d가 없고 imageUrl이 있으면 Meshy API로 생성 시도
      try {
        console.log("🔧 Generating 3D asset via Meshy API...");
        const glbBuffer = await generateGLBWithMeshy({ imageUrl });
        const blob = await put(
          `3d-assets/${ornamentId}_${timestamp}.glb`,
          glbBuffer,
          {
            access: "public",
            contentType: "model/gltf-binary",
            allowOverwrite: true,
            token: BLOB_TOKEN,
          }
        );
        asset3dUrl = blob.url;
        console.log("✅ 3D asset generated & uploaded:", asset3dUrl);
      } catch (e) {
        console.error("❌ Meshy 3D generation/upload failed:", e);
        // Meshy API 실패해도 다른 데이터는 저장되도록 계속 진행
      }
    } else {
      console.log("⚠️ No 3D asset or image provided");
    }

    let podcastUrl = existingData.podcastUrl;
    if (podcast) {
      const blob = await put(
        `podcasts/${ornamentId}_${timestamp}_${podcast.name}`,
        podcast,
        {
          access: "public",
          contentType: "audio/wav",
          allowOverwrite: true,
          token: BLOB_TOKEN,
        }
      );
      podcastUrl = blob.url;
      console.log("✅ Podcast uploaded:", podcastUrl);
    }

    let bgmUrl = existingData.bgmUrl;
    if (bgm) {
      const blob = await put(
        `bgm/${ornamentId}_${timestamp}_${bgm.name}`,
        bgm,
        {
          access: "public",
          contentType: "audio/wav",
          allowOverwrite: true,
          token: BLOB_TOKEN,
        }
      );
      bgmUrl = blob.url;
      console.log("✅ BGM uploaded:", bgmUrl);
    }

    const updatedStory = story || existingData.story;
    const updatedOrnamentName = ornamentName || existingData.ornamentName;
    const updatedPodcastScript = podcastScript || existingData.podcastScript;
    const updatedEmotion = emotion || existingData.emotion;

    const letterData = {
      ...existingData,
      id: ornamentId,
      ornamentName: updatedOrnamentName,
      story: updatedStory,
      podcastScript: updatedPodcastScript,
      emotion: updatedEmotion,
      imageUrl,
      asset3dUrl,
      podcastUrl,
      bgmUrl,
      updatedAt: new Date().toISOString(),
    };

    console.log("💾 Saving letterData:", letterData);

    await put(`letters/${ornamentId}.json`, JSON.stringify(letterData), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
      token: BLOB_TOKEN,
    });

    // 기존 파이썬 스크립트 호출 부분 삭제 (Meshy API로 대체)

    return NextResponse.json({ success: true, data: letterData });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "letters/", token: BLOB_TOKEN });

    const letters = await Promise.all(
      blobs.map(async (blob: any) => {
        const response = await fetch(blob.url);
        return response.json();
      })
    );

    return NextResponse.json({ success: true, data: letters });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
