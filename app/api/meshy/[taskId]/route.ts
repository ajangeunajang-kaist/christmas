import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_TOKEN: string | undefined = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_TOKEN || undefined;

// Meshy task 상태 조회 및 완료 시 GLB 다운로드
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const ornamentId = searchParams.get("ornamentId");
    const apiKey = process.env.MESHY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "MESHY_API_KEY is not set" },
        { status: 500 }
      );
    }

    // Meshy API에서 task 상태 조회 (text-to-3d v2)
    const statusResponse = await fetch(
      `https://api.meshy.ai/v2/text-to-3d/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to check task status: ${statusResponse.status}` },
        { status: statusResponse.status }
      );
    }

    const status = await statusResponse.json();

    // 상태 정보 반환
    const result: any = {
      success: true,
      status: status.status,
      progress: status.progress || 0,
    };

    // 완료되었으면 GLB 다운로드 및 업로드
    if (status.status === "SUCCEEDED" && status.model_urls?.glb) {
      const glbUrl = status.model_urls.glb;

      console.log("⬇️ Downloading GLB from:", glbUrl);
      const glbRes = await fetch(glbUrl);
      if (!glbRes.ok) {
        return NextResponse.json(
          { success: false, error: "Failed to download GLB" },
          { status: 500 }
        );
      }

      const glbBuffer = Buffer.from(await glbRes.arrayBuffer());
      console.log("✅ GLB downloaded, size:", glbBuffer.length, "bytes");

      // Vercel Blob에 업로드
      const timestamp = Date.now();
      const blob = await put(
        `3d-assets/${taskId}_${timestamp}.glb`,
        glbBuffer,
        {
          access: "public",
          contentType: "model/gltf-binary",
          allowOverwrite: true,
          token: BLOB_TOKEN,
        }
      );

      result.asset3dUrl = blob.url;
      console.log("✅ 3D asset uploaded:", blob.url);

      // letter JSON 업데이트
      if (ornamentId) {
        try {
          // 기존 letter 데이터 가져오기
          const { blobs } = await list({
            prefix: `letters/${ornamentId}.json`,
            token: BLOB_TOKEN
          });

          if (blobs.length > 0) {
            const letterBlob = blobs[0];
            const letterResponse = await fetch(letterBlob.url);
            const letterData = await letterResponse.json();

            // asset3dUrl 업데이트
            const updatedLetterData = {
              ...letterData,
              asset3dUrl: blob.url,
              updatedAt: new Date().toISOString(),
            };

            // letter JSON 저장
            await put(`letters/${ornamentId}.json`, JSON.stringify(updatedLetterData), {
              access: "public",
              contentType: "application/json",
              allowOverwrite: true,
              token: BLOB_TOKEN,
            });

            console.log("✅ Letter data updated with asset3dUrl");
          } else {
            console.warn("⚠️ Could not find letter data to update");
          }
        } catch (error) {
          console.error("❌ Failed to update letter data:", error);
        }
      }
    }

    if (status.status === "FAILED") {
      result.error = "Meshy task failed";
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Meshy status check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check status" },
      { status: 500 }
    );
  }
}
