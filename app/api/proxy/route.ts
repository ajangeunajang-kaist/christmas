import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { id } = req.body;

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
      return res
        .status(extRes.status)
        .json({
          message: "Error fetching data from external server",
          detail: text,
        });
    }

    const extData = await extRes.json();
    res.status(200).json(extData);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ message: "Proxy error", detail: String(error) });
  }
}
