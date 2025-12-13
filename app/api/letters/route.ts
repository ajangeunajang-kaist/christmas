import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";


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
        `${process.env.BLOB_READ_WRITE_TOKEN ? "https://" : ""}${
          process.env.VERCEL_URL || "localhost:3000"
        }/api/letters/${ornamentId}`
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
        }
      );
      asset3dUrl = blob.url;
      console.log("✅ 3D asset uploaded:", asset3dUrl);
    } else {
      console.log("⚠️ No 3D asset received");
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
    });

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
    const { blobs } = await list({ prefix: "letters/" });

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
