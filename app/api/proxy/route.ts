import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 외부 서버로 요청
    const extRes = await fetch("http://mac-beatles1.kaist.ac.kr:50003/start-job", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await extRes.json();
    return NextResponse.json(data, { status: extRes.status });
  } catch (err) {
    return NextResponse.json({ error: "Proxy error", detail: String(err) }, { status: 500 });
  }
}