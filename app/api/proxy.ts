import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { id } = req.body;

  const extRes = await fetch(
    "http://mac-beatles1.kaist.ac.kr:50003/start-job",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }
  );

  if (!extRes.ok) {
    return res.status(extRes.status).json({ message: "Error fetching data from external server" });
  }

  const extData = await extRes.json();
  res.status(200).json(extData);
}