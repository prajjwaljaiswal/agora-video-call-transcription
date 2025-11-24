import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET for this endpoint
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const transcripts = await storage.getAllTranscripts();
    const transcript = transcripts.find((t) => t.id === id);

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    // Parse participants JSON string
    const parsedTranscript = {
      ...transcript,
      participants: JSON.parse(transcript.participants || "[]"),
    };

    return res.status(200).json(parsedTranscript);
  } catch (error: any) {
    console.error(`Error fetching transcript: ${error.message}`);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

