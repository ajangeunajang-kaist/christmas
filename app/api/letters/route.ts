import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import OpenAI from "openai";

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI Vision API로 이미지에서 주요 object 추출
async function extractObjectFromImage(imageUrl: string): Promise<string | null> {
  try {
    console.log("🔍 Extracting object from image:", imageUrl);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify the main object in this image and describe it in 2-4 words. Just name the object, nothing else. For example: 'red hammer', 'wooden chair', 'vintage camera'."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 50,
    });

    const extractedObject = response.choices[0]?.message?.content?.trim() || null;
    console.log("✅ Extracted object:", extractedObject);
    return extractedObject;
  } catch (e) {
    console.error("❌ Failed to extract object from image:", e);
    return null;
  }
}

// Meshy API refine task 생성 함수
async function createMeshyRefineTask({
  previewTaskId
}: {
  previewTaskId: string;
}): Promise<string | null> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    console.error("❌ MESHY_API_KEY is not set");
    return null;
  }

  try {
    console.log("🎨 Creating Meshy refine task for preview:", previewTaskId);

    const requestBody = {
      mode: "refine",
      preview_task_id: previewTaskId,
    };
    console.log("📦 Refine request body:", JSON.stringify(requestBody, null, 2));

    const createResponse = await fetch("https://api.meshy.ai/v2/text-to-3d", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 Refine response status:", createResponse.status);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`❌ Meshy refine task creation failed: ${createResponse.status}`);
      console.error(`❌ Error response:`, errorText);
      return null;
    }

    const taskData = await createResponse.json();
    console.log("📥 Refine response data:", JSON.stringify(taskData, null, 2));

    const taskId = taskData.result || taskData.id;

    if (!taskId) {
      console.error("❌ No task ID in refine response:", taskData);
      return null;
    }

    console.log("✅ Meshy refine task created:", taskId);
    return taskId;
  } catch (e) {
    console.error("❌ Meshy refine task creation exception:", e);
    console.error("❌ Exception details:", JSON.stringify(e, null, 2));
    return null;
  }
}

// Meshy API text-to-3d task 생성 함수
async function createMeshyTask({
  prompt
}: {
  prompt: string;
}): Promise<string | null> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    console.error("❌ MESHY_API_KEY is not set");
    return null;
  }

  try {
    console.log("🚀 Creating Meshy text-to-3d task with prompt:", prompt);

    const requestBody = {
      mode: "preview",
      prompt: prompt,
      ai_model: "latest",
      topology: "triangle",
      target_polycount: 200,
      should_remesh: true,
      art_style: "sculpture", // 카툰 스타일에 적합
      should_texture: true,
      enable_pbr: false,
    };
    console.log("📦 Request body:", JSON.stringify(requestBody, null, 2));

    const createResponse = await fetch("https://api.meshy.ai/v2/text-to-3d", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 Response status:", createResponse.status);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`❌ Meshy task creation failed: ${createResponse.status}`);
      console.error(`❌ Error response:`, errorText);
      return null;
    }

    const taskData = await createResponse.json();
    console.log("📥 Response data:", JSON.stringify(taskData, null, 2));

    const taskId = taskData.result || taskData.id;

    if (!taskId) {
      console.error("❌ No task ID in response:", taskData);
      return null;
    }

    console.log("✅ Meshy text-to-3d task created:", taskId);
    return taskId;
  } catch (e) {
    console.error("❌ Meshy task creation exception:", e);
    console.error("❌ Exception details:", JSON.stringify(e, null, 2));
    return null;
  }
}

// Support multiple env var names for the blob token (VERCEL UI vs local .env)
const BLOB_TOKEN: string | undefined = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_TOKEN || undefined;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const ornamentId = formData.get("ornamentId") as string;
    const ornamentName = formData.get("ornamentName") as string | null;
    const story = formData.get("story") as string | null;
    const podcastScript = formData.get("podcastScript") as string | null;
    const emotion = formData.get("emotion") as string | null;
    const imageUrlFromForm = formData.get("imageUrl") as string | null;
    const asset3dUrlFromForm = formData.get("asset3dUrl") as string | null;
    const refineTaskIdFromForm = formData.get("refineTaskId") as string | null;
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
      extractedObject: null,
      asset3dUrl: null,
      meshyTaskId: null,
      refineTaskId: null,
      podcastUrl: null,
      bgmUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      console.log("🔍 Fetching existing data for ornamentId:", ornamentId);

      // Vercel Blob에서 직접 가져오기 (API 호출 대신)
      const { blobs } = await list({
        prefix: `letters/${ornamentId}.json`,
        token: BLOB_TOKEN,
      });

      console.log("📦 Found blobs:", blobs.length);

      if (blobs.length > 0) {
        const letterBlob = blobs[0];
        const response = await fetch(letterBlob.url);
        const letterData = await response.json();

        console.log("✅ Existing letterData loaded:", {
          hasRefineTaskId: !!letterData.refineTaskId,
          refineTaskId: letterData.refineTaskId,
          hasMeshyTaskId: !!letterData.meshyTaskId,
          hasPodcastUrl: !!letterData.podcastUrl,
          hasBgmUrl: !!letterData.bgmUrl
        });

        existingData = { ...existingData, ...letterData };
        console.log("✅ existingData merged:", {
          refineTaskId: existingData.refineTaskId,
          podcastUrl: existingData.podcastUrl,
          bgmUrl: existingData.bgmUrl
        });
      } else {
        console.log("ℹ️ No existing data found, will create new");
      }
    } catch (e) {
      console.log("❌ Error fetching existing data:", e);
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
    let meshyTaskId = existingData.meshyTaskId || null;
    let refineTaskId = existingData.refineTaskId;  // 기존 값 유지
    let extractedObject = existingData.extractedObject || null;

    // formData에서 받은 refineTaskId가 있으면 사용
    if (refineTaskIdFromForm) {
      refineTaskId = refineTaskIdFromForm;
      console.log("✅ Refine task ID from form:", refineTaskId);
    }

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
    } else if (asset3dUrlFromForm) {
      // formData에서 받은 asset3dUrl이 있으면 사용
      asset3dUrl = asset3dUrlFromForm;
      console.log("✅ 3D asset URL from form:", asset3dUrl);
    } else if (imageUrl && story && !meshyTaskId) {
      // asset3d가 없고 imageUrl과 story가 있으면 text-to-3d task 생성
      console.log("🔧 Creating Meshy text-to-3d task...");

      // 1. 이미지에서 object 추출
      extractedObject = await extractObjectFromImage(imageUrl);

      if (extractedObject) {
        // 2. extracted object + style description으로 prompt 생성
        const prompt = `Low poly cartoon style ${extractedObject}. Keep the geometry low-poly, cartoony, and appealing.`;
        console.log("📝 Generated prompt:", prompt);

        // 3. Meshy text-to-3d API 호출
        meshyTaskId = await createMeshyTask({ prompt });
        if (meshyTaskId) {
          console.log("✅ Meshy text-to-3d task ID saved:", meshyTaskId);
        } else {
          console.log("⚠️ Failed to create Meshy task");
        }
      } else {
        console.log("⚠️ Failed to extract object from image");
      }
    } else {
      console.log("⚠️ No 3D asset or required data (image & story) provided");
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

    // formData에 값이 있으면 사용, 없으면 기존 값 유지
    const updatedStory = story !== null ? story : existingData.story;
    const updatedOrnamentName = ornamentName !== null ? ornamentName : existingData.ornamentName;
    const updatedPodcastScript = podcastScript !== null ? podcastScript : existingData.podcastScript;
    const updatedEmotion = emotion !== null ? emotion : existingData.emotion;

    console.log("🔧 Before creating letterData:", {
      podcastUrl_variable: podcastUrl,
      bgmUrl_variable: bgmUrl,
      existingData_podcastUrl: existingData.podcastUrl,
      existingData_bgmUrl: existingData.bgmUrl,
      refineTaskId_variable: refineTaskId,
      existingData_refineTaskId: existingData.refineTaskId
    });

    const letterData = {
      ...existingData,
      id: ornamentId,
      ornamentName: updatedOrnamentName,
      story: updatedStory,
      podcastScript: updatedPodcastScript,
      emotion: updatedEmotion,
      // 새로 업로드된 값이 있으면 사용, 없으면 기존 값 유지
      imageUrl: imageUrl !== null ? imageUrl : existingData.imageUrl,
      extractedObject: extractedObject !== null ? extractedObject : existingData.extractedObject,
      asset3dUrl: asset3dUrl !== null ? asset3dUrl : existingData.asset3dUrl,
      meshyTaskId: meshyTaskId !== null ? meshyTaskId : existingData.meshyTaskId,
      refineTaskId: refineTaskId !== null ? refineTaskId : existingData.refineTaskId,
      podcastUrl: podcastUrl !== null ? podcastUrl : existingData.podcastUrl,
      bgmUrl: bgmUrl !== null ? bgmUrl : existingData.bgmUrl,
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

    // 커스텀 순서 정의 (원하는 순서대로 배치)
    const CUSTOM_ORDER = [
      "ornament_1765809199791_g5d2tabla",
      "ornament_1765803109037_h0csus9x7",
      "ornament_1765736454433_wtn842iha",
      "ornament_1765804062175_v6icxk67c",
      "ornament_1765810669345_980xlkts5",
    ];

    // 커스텀 순서대로 정렬
    const sortedLetters = letters.sort((a, b) => {
      const indexA = CUSTOM_ORDER.indexOf(a.id);
      const indexB = CUSTOM_ORDER.indexOf(b.id);

      // 목록에 없는 항목은 뒤로 보냄
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    return NextResponse.json({ success: true, data: sortedLetters });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
