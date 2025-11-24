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
    const meetingId = req.query.meetingId as string | undefined;

    let transcripts;
    if (meetingId) {
      transcripts = await storage.getTranscriptsByMeetingId(meetingId);
    } else {
      transcripts = await storage.getAllTranscripts();
    }

    // Parse participants JSON strings
    const parsedTranscripts = transcripts.map((t) => ({
      ...t,
      participants: JSON.parse(t.participants || "[]"),
    }));

    return res.status(200).json(parsedTranscripts);
  } catch (error: any) {
    console.error(`Error fetching transcripts: ${error.message}`);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

