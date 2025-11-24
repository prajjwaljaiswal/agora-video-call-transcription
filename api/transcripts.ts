import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../server/storage";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { meetingId, content, participants } = req.body;

    if (!meetingId || !content) {
      return res.status(400).json({
        message: "meetingId and content are required",
      });
    }

    const transcript = await storage.createTranscript({
      meetingId,
      content,
      participants: JSON.stringify(participants || []),
    });

    console.log(`Created transcript ${transcript.id} for meeting ${meetingId}`);
    return res.status(200).json(transcript);
  } catch (error: any) {
    console.error(`Error creating transcript: ${error.message}`);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

