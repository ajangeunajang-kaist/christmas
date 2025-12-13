import type { NextApiRequest, NextApiResponse } from "next";

export async function POST(request: Request) {
  const { id } = await request.json();

  try {
    const extRes = await fetch(
      "http://mac-beatles1.kaist.ac.kr:50003/start-job",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }
    );

    if (!extRes.ok) {
      const text = await extRes.text();
      console.error("External server error:", text);
      return new Response(
        JSON.stringify({
          message: "Error fetching data from external server",
          detail: text,
        }),
        { status: extRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const extData = await extRes.json();
    return new Response(JSON.stringify(extData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return new Response(
      JSON.stringify({ message: "Proxy error", detail: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
