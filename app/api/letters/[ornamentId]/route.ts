import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

const BLOB_TOKEN: string | undefined =
  process.env.BLOB_READ_WRITE_TOKEN ||
  process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_TOKEN ||
  undefined;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ornamentId: string }> }
) {
  try {
    const { ornamentId } = await params;

    // Vercel Blob에서 해당 ornamentId의 letter 데이터 가져오기
    const { blobs } = await list({
      prefix: `letters/${ornamentId}.json`,
      token: BLOB_TOKEN,
    });

    if (blobs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Letter not found" },
        { status: 404 }
      );
    }

    const letterBlob = blobs[0];
    const response = await fetch(letterBlob.url);
    const letterData = await response.json();

    return NextResponse.json({ success: true, data: letterData });
  } catch (error) {
    console.error("Error fetching letter:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch letter" },
      { status: 500 }
    );
  }
}
