import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { log } from "./app";

export interface Participant {
  id: string;
  name: string;
  role: "host" | "expert" | "guest";
  isMuted: boolean;
  isVideoOff: boolean;
  joinedAt: number;
}

interface MeetingState {
  [meetingId: string]: Participant[];
}

const meetingState: MeetingState = {};
const meetingSockets = new Map<string, Set<string>>(); // meetingId -> Set of socket IDs

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Transcript API endpoints
  app.post("/api/transcripts", async (req, res) => {
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

      log(`Created transcript ${transcript.id} for meeting ${meetingId}`);
      res.json(transcript);
    } catch (error: any) {
      log(`Error creating transcript: ${error.message}`);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/transcripts", async (req, res) => {
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

      res.json(parsedTranscripts);
    } catch (error: any) {
      log(`Error fetching transcripts: ${error.message}`);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/transcripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

      res.json(parsedTranscript);
    } catch (error: any) {
      log(`Error fetching transcript: ${error.message}`);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // Set up Socket.IO server for meeting synchronization
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.address || "unknown";
    log(`Socket.IO client connected: ${socket.id} from ${clientIp}`);

    let currentMeetingId: string | null = null;
    let currentParticipantId: string | null = null;

    // Handle join meeting
    socket.on("join", ({ meetingId, participant }: { meetingId: string; participant: Participant }) => {
      try {
        currentMeetingId = meetingId;
        currentParticipantId = participant.id;

        // Initialize meeting state if needed
        if (!meetingState[meetingId]) {
          meetingState[meetingId] = [];
        }

        // Add participant if not already present
        const existingIndex = meetingState[meetingId].findIndex(
          (p) => p.id === participant.id
        );
        if (existingIndex >= 0) {
          meetingState[meetingId][existingIndex] = participant;
        } else {
          meetingState[meetingId].push(participant);
        }

        // Track socket for this meeting
        if (!meetingSockets.has(meetingId)) {
          meetingSockets.set(meetingId, new Set());
        }
        meetingSockets.get(meetingId)!.add(socket.id);

        // Join socket room for this meeting
        socket.join(meetingId);

        // Broadcast updated participant list to all clients in this meeting
        io.to(meetingId).emit("participants", meetingState[meetingId]);

        log(`Participant ${participant.name} joined meeting ${meetingId}`);
      } catch (error) {
        log(`Join error: ${error}`);
      }
    });

    // Handle participant update
    socket.on("update", ({ meetingId, participantId, updates }: { meetingId: string; participantId: string; updates: Partial<Participant> }) => {
      try {
        if (!meetingState[meetingId]) return;

        const participant = meetingState[meetingId].find(
          (p) => p.id === participantId
        );
        if (participant) {
          Object.assign(participant, updates);
          io.to(meetingId).emit("participants", meetingState[meetingId]);
        }
      } catch (error) {
        log(`Update error: ${error}`);
      }
    });

    // Handle leave meeting
    socket.on("leave", ({ meetingId, participantId }: { meetingId: string; participantId: string }) => {
      try {
        if (meetingState[meetingId]) {
          meetingState[meetingId] = meetingState[meetingId].filter(
            (p) => p.id !== participantId
          );
          io.to(meetingId).emit("participants", meetingState[meetingId]);
          log(`Participant ${participantId} left meeting ${meetingId}`);
        }

        // Remove socket from meeting
        const sockets = meetingSockets.get(meetingId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            meetingSockets.delete(meetingId);
          }
        }
      } catch (error) {
        log(`Leave error: ${error}`);
      }
    });

    // Handle get participants request
    socket.on("getParticipants", ({ meetingId }: { meetingId: string }) => {
      try {
        if (meetingId) {
          currentMeetingId = meetingId;
          
          // Track socket for this meeting
          if (!meetingSockets.has(meetingId)) {
            meetingSockets.set(meetingId, new Set());
          }
          meetingSockets.get(meetingId)!.add(socket.id);

          // Join socket room
          socket.join(meetingId);

          // Send current participants
          const participants = meetingState[meetingId] || [];
          socket.emit("participants", participants);
        }
      } catch (error) {
        log(`GetParticipants error: ${error}`);
      }
    });

    // Handle transcript segment sharing
    socket.on("transcriptSegment", ({ meetingId, segment }: { meetingId: string; segment: any }) => {
      try {
        if (meetingId && segment) {
          // Broadcast transcript segment to all participants in the meeting (except sender)
          socket.to(meetingId).emit("transcriptSegment", { meetingId, segment });
          log(`Broadcasted transcript segment from ${segment.speaker} in meeting ${meetingId}`);
        }
      } catch (error) {
        log(`TranscriptSegment error: ${error}`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      log(`Socket.IO client disconnected: ${socket.id} - Reason: ${reason}`);
      if (currentMeetingId && currentParticipantId) {
        // Remove participant from meeting
        if (meetingState[currentMeetingId]) {
          meetingState[currentMeetingId] = meetingState[currentMeetingId].filter(
            (p) => p.id !== currentParticipantId
          );
          io.to(currentMeetingId).emit("participants", meetingState[currentMeetingId]);
        }

        // Remove socket from meeting
        const sockets = meetingSockets.get(currentMeetingId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            meetingSockets.delete(currentMeetingId);
          }
        }
      }
    });

    socket.on("error", (error) => {
      log(`Socket.IO error for ${socket.id}: ${error}`);
      console.error("Socket.IO error details:", error);
    });
  });

  log("Socket.IO server initialized on /socket.io/");

  return httpServer;
}
