import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end(); // Method Not Allowed
  }

  const { id } = req.body;

  // 외부 서버로 전달
  const extRes = await fetch("외부서버주소", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!extRes.ok) {
    return res.status(extRes.status).json({ message: "Error fetching data from external server" });
  }

  const extData = await extRes.json();
  res.status(200).json(extData);
}