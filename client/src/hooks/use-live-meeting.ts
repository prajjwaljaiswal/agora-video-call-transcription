import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface Participant {
  id: string;
  name: string;
  role: "host" | "expert" | "guest";
  isMuted: boolean;
  isVideoOff: boolean;
  joinedAt: number;
}

export function useLiveMeeting(meetingId: string | undefined) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const localParticipantRef = useRef<string | null>(null);

  // Get Socket.IO server URL - works in both dev and production
  const getServerUrl = useCallback(() => {
    if (typeof window === "undefined") return null;

    // Use the current window location to build server URL
    const serverUrl = window.location.origin;

    console.log("🔗 Building Socket.IO URL:", {
      serverUrl,
      origin: window.location.origin,
    });

    return serverUrl;
  }, []);

  // Connect to Socket.IO server
  useEffect(() => {
    if (!meetingId) {
      // Disconnect if no meeting ID
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const serverUrl = getServerUrl();
    if (!serverUrl) return;

    // Connect to Socket.IO server
    console.log(`🔌 Attempting to connect to Socket.IO: ${serverUrl}`);
    const socket = io(serverUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket.IO connected successfully:", socket.id);
      setIsConnected(true);

      // Request current participants for this meeting
      socket.emit("getParticipants", { meetingId });
      console.log("📤 Sent getParticipants request for meeting:", meetingId);

      // If we already have a local participant ID (e.g., host auto-joined), send join message
      // This ensures the host appears in the participants list for guests
      // Use a small delay to ensure getParticipants is processed first
      setTimeout(() => {
        const currentLocalId = localParticipantRef.current;
        if (currentLocalId) {
          setParticipants((prev) => {
            const currentParticipant = prev.find(
              (p) => p.id === currentLocalId
            );
            if (currentParticipant) {
              socket.emit("join", {
                meetingId,
                participant: currentParticipant,
              });
              console.log(
                "📤 Re-sent join message for existing participant:",
                currentParticipant.name
              );
              return prev; // Return unchanged since we're just sending to server
            }
            return prev;
          });
        }
      }, 200);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket.IO disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", error);
      console.error("❌ Error details:", error.message, error);
      setIsConnected(false);
    });

    // Listen for reconnection attempts
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}`);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Socket.IO reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      // Request participants again after reconnect
      socket.emit("getParticipants", { meetingId });
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Socket.IO reconnection failed");
      setIsConnected(false);
    });

    socket.on("participants", (participantsList: Participant[]) => {
      console.log(
        `📥 Received ${participantsList?.length || 0} participants from server`
      );
      console.log(
        "📥 Server participants:",
        participantsList.map((p) => ({ id: p.id, name: p.name, role: p.role }))
      );

      // Merge server participants with local participant if we have one
      // This ensures the local participant (host) stays visible even if not synced to server yet
      setParticipants((prev) => {
        const serverParticipants = participantsList || [];
        const currentLocalId = localParticipantRef.current;

        // If we have a local participant ID that's not in server list, merge it in
        if (currentLocalId) {
          const localInServer = serverParticipants.find(
            (p) => p.id === currentLocalId
          );
          const localInPrev = prev.find((p) => p.id === currentLocalId);

          if (!localInServer && localInPrev) {
            // Local participant not in server list yet, add it
            console.log(
              "➕ Adding local participant to server list:",
              localInPrev.name
            );
            return [localInPrev, ...serverParticipants];
          } else if (localInServer) {
            // Local participant is in server list, use server version (it's synced)
            console.log(
              "✅ Local participant found in server list:",
              localInServer.name
            );
            return serverParticipants;
          } else if (localInPrev) {
            // Local participant exists in prev but not in server - keep it and add to list
            console.log(
              "⚠️ Local participant not synced yet, keeping:",
              localInPrev.name
            );
            return [localInPrev, ...serverParticipants];
          }
        }

        // Otherwise just use server list
        return serverParticipants;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, getServerUrl]);

  const joinMeeting = useCallback(
    (name: string, role: Participant["role"]) => {
      // Don't join again if already joined
      if (localParticipantId) {
        console.log("Already joined as participant", localParticipantId);
        return localParticipantId;
      }

      if (!meetingId) {
        console.error("Cannot join meeting: no meeting ID");
        return null;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const newParticipant: Participant = {
        id,
        name,
        role,
        isMuted: false,
        isVideoOff: false,
        joinedAt: Date.now(),
      };

      setLocalParticipantId(id);
      localParticipantRef.current = id; // Update ref for use in socket handlers

      // Optimistically update local state first
      setParticipants((prev) => {
        const filtered = prev.filter((p) => p.id !== id);
        return [...filtered, newParticipant];
      });

      // Send join message to server via Socket.IO
      // Socket.IO will automatically queue messages if not connected
      const sendJoinMessage = () => {
        if (socketRef.current) {
          socketRef.current.emit("join", {
            meetingId,
            participant: newParticipant,
          });
          console.log("✅ Sent join message via Socket.IO");
          return true;
        }
        return false;
      };

      if (socketRef.current && socketRef.current.connected) {
        sendJoinMessage();
      } else {
        console.warn(
          "⚠️ Socket.IO not connected yet, will send when connected"
        );
        // Use Socket.IO's connect event to send when ready
        if (socketRef.current) {
          const connectHandler = () => {
            sendJoinMessage();
            socketRef.current?.off("connect", connectHandler);
          };
          socketRef.current.on("connect", connectHandler);
        }
      }

      return id;
    },
    [localParticipantId, meetingId]
  );

  const leaveMeeting = useCallback(() => {
    if (!localParticipantId || !meetingId) return;

    const participantIdToLeave = localParticipantId;

    // Send leave message to server
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("leave", {
        meetingId,
        participantId: participantIdToLeave,
      });
    }

    setLocalParticipantId(null);
    localParticipantRef.current = null; // Clear ref

    // Optimistically update local state
    setParticipants((prev) =>
      prev.filter((p) => p.id !== participantIdToLeave)
    );
  }, [localParticipantId, meetingId]);

  const toggleMic = useCallback(
    (mute: boolean) => {
      if (!localParticipantId || !meetingId) return;

      // Send update message to server
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("update", {
          meetingId,
          participantId: localParticipantId,
          updates: { isMuted: mute },
        });
      }

      // Optimistically update local state
      setParticipants((prev) => {
        return prev.map((p) =>
          p.id === localParticipantId ? { ...p, isMuted: mute } : p
        );
      });
    },
    [localParticipantId, meetingId]
  );

  const toggleVideo = useCallback(
    (videoOff: boolean) => {
      if (!localParticipantId || !meetingId) return;

      // Send update message to server
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("update", {
          meetingId,
          participantId: localParticipantId,
          updates: { isVideoOff: videoOff },
        });
      }

      // Optimistically update local state
      setParticipants((prev) => {
        return prev.map((p) =>
          p.id === localParticipantId ? { ...p, isVideoOff: videoOff } : p
        );
      });
    },
    [localParticipantId, meetingId]
  );

  return {
    participants,
    localParticipantId,
    isConnected,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleVideo,
    socket: socketRef.current, // Expose socket for transcript sharing
  };
}
