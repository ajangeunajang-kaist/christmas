import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_TOKEN: string | undefined = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_TOKEN || undefined;

// Meshy API refine task 생성 함수
async function createMeshyRefineTask(previewTaskId: string): Promise<string | null> {
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
    return null;
  }
}

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
      taskId: taskId,
    };

    // Preview task가 완료되면 refine task 생성
    if (status.status === "SUCCEEDED" && ornamentId) {
      console.log("🔍 Task succeeded, ornamentId:", ornamentId, "taskId:", taskId);

      // Letter data 가져오기
      const { blobs } = await list({
        prefix: `letters/${ornamentId}.json`,
        token: BLOB_TOKEN
      });

      console.log("📦 Found blobs:", blobs.length);

      if (blobs.length > 0) {
        const letterBlob = blobs[0];
        const letterResponse = await fetch(letterBlob.url);
        const letterData = await letterResponse.json();

        console.log("📄 Letter data:", {
          meshyTaskId: letterData.meshyTaskId,
          refineTaskId: letterData.refineTaskId,
          asset3dUrl: letterData.asset3dUrl ? "exists" : "null",
          currentTaskId: taskId
        });

        // Preview task이고 아직 refine task가 없으면 생성
        if (letterData.meshyTaskId === taskId && !letterData.refineTaskId) {
          console.log("🎨 Preview task completed, creating refine task...");
          const refineTaskId = await createMeshyRefineTask(taskId);

          if (refineTaskId) {
            // Letter data에 refine task ID 저장
            const updatedLetterData = {
              ...letterData,
              refineTaskId: refineTaskId,
              updatedAt: new Date().toISOString(),
            };

            await put(`letters/${ornamentId}.json`, JSON.stringify(updatedLetterData), {
              access: "public",
              contentType: "application/json",
              allowOverwrite: true,
              token: BLOB_TOKEN,
            });

            console.log("✅ Refine task created and saved:", refineTaskId);
            result.refineTaskId = refineTaskId;
            result.message = "Preview completed, refine task started";
          }
        }
        // Refine task가 완료되면 GLB 다운로드
        else if (letterData.refineTaskId === taskId && status.model_urls?.glb) {
          console.log("🎨 Refine task completed, downloading GLB...");
          console.log("✅ Condition met: letterData.refineTaskId === taskId:", letterData.refineTaskId === taskId);
          console.log("✅ model_urls.glb exists:", !!status.model_urls?.glb);
          console.log("📍 letterData.refineTaskId:", letterData.refineTaskId);
          console.log("📍 taskId:", taskId);
          console.log("📍 asset3dUrl before:", letterData.asset3dUrl);

          const glbUrl = status.model_urls.glb;

          console.log("⬇️ Downloading GLB from:", glbUrl);
          const glbRes = await fetch(glbUrl);
          if (!glbRes.ok) {
            console.error("❌ GLB download failed:", glbRes.status, glbRes.statusText);
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
          console.log("✅ 3D asset uploaded to blob:", blob.url);

          // asset3dUrl 업데이트
          const updatedLetterData = {
            ...letterData,
            asset3dUrl: blob.url,
            updatedAt: new Date().toISOString(),
          };

          console.log("💾 Updating letter data with asset3dUrl...");

          // letter JSON 저장
          const savedBlob = await put(`letters/${ornamentId}.json`, JSON.stringify(updatedLetterData), {
            access: "public",
            contentType: "application/json",
            allowOverwrite: true,
            token: BLOB_TOKEN,
          });

          console.log("✅ Letter data updated with asset3dUrl:", savedBlob.url);
          console.log("📝 Updated letter data:", JSON.stringify(updatedLetterData, null, 2));
        } else {
          console.log("⚠️ Condition not met for GLB download:");
          console.log("  - letterData.meshyTaskId === taskId:", letterData.meshyTaskId === taskId);
          console.log("  - letterData.meshyTaskId:", letterData.meshyTaskId);
          console.log("  - letterData.refineTaskId === taskId:", letterData.refineTaskId === taskId);
          console.log("  - letterData.refineTaskId:", letterData.refineTaskId);
          console.log("  - taskId:", taskId);
          console.log("  - status.model_urls?.glb exists:", !!status.model_urls?.glb);
          console.log("  - letterData.asset3dUrl:", letterData.asset3dUrl);

          // 만약 refine task가 완료되었는데 asset3dUrl이 없고 GLB URL이 있다면 재시도
          if (letterData.refineTaskId === taskId && !letterData.asset3dUrl && status.model_urls?.glb) {
            console.log("🔄 Retrying GLB download for refine task...");
            try {
              const glbUrl = status.model_urls.glb;
              console.log("⬇️ Downloading GLB from:", glbUrl);
              const glbRes = await fetch(glbUrl);
              if (!glbRes.ok) {
                console.error("❌ GLB download failed:", glbRes.status, glbRes.statusText);
              } else {
                const glbBuffer = Buffer.from(await glbRes.arrayBuffer());
                console.log("✅ GLB downloaded, size:", glbBuffer.length, "bytes");

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
                console.log("✅ 3D asset uploaded to blob:", blob.url);

                const updatedLetterData = {
                  ...letterData,
                  asset3dUrl: blob.url,
                  updatedAt: new Date().toISOString(),
                };

                console.log("💾 Updating letter data with asset3dUrl...");
                await put(`letters/${ornamentId}.json`, JSON.stringify(updatedLetterData), {
                  access: "public",
                  contentType: "application/json",
                  allowOverwrite: true,
                  token: BLOB_TOKEN,
                });

                console.log("✅ Letter data updated with asset3dUrl (retry):", blob.url);
              }
            } catch (retryError) {
              console.error("❌ Retry GLB download failed:", retryError);
            }
          }
        }
      } else {
        console.error("❌ No letter data found for ornamentId:", ornamentId);
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
