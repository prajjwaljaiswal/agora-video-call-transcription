import { useEffect, useRef, useState, useCallback } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { AGORA_CONFIG } from "@/config/agora";

export interface AgoraVideoTrack {
  localVideoTrack: any | null;
  localAudioTrack: any | null;
  remoteUsers: any[];
}

export function useAgoraVideo(
  channelName: string | undefined,
  userId: string | undefined,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [localVideoTrack, setLocalVideoTrack] = useState<any | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<any | null>(null);
  const localVideoTrackRef = useRef<any | null>(null);
  const localAudioTrackRef = useRef<any | null>(null);

  // Initialize Agora client
  useEffect(() => {
    console.log("Agora video hook initialized", {
      channelName,
      userId,
      enabled,
      appId: AGORA_CONFIG.appId,
    });

    if (!channelName || !userId || !enabled || !AGORA_CONFIG.appId) {
      console.log("Agora not initialized - missing config:", {
        channelName,
        userId,
        enabled,
        appId: !!AGORA_CONFIG.appId,
      });
      return;
    }

    if (!AGORA_CONFIG.appId) {
      console.warn(
        "⚠️ Agora App ID not configured. Please set VITE_AGORA_APP_ID environment variable."
      );
      console.warn("Get your App ID from: https://console.agora.io/");
      return;
    }

    // Create Agora client with configuration
    const client = AgoraRTC.createClient({
      mode: "rtc", // Use RTC mode for video calling
      codec: "vp8", // Video codec
    });

    // Enable log upload for debugging (optional)
    AgoraRTC.setLogLevel(2); // 0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR, 4=NONE

    clientRef.current = client;

    // Handle remote user published
    client.on("user-published", async (user, mediaType) => {
      console.log("📥 User published:", user.uid, mediaType);

      await client.subscribe(user, mediaType);

      if (mediaType === "video") {
        setRemoteUsers((prev) => {
          const exists = prev.find((u) => u.uid === user.uid);
          if (!exists) {
            return [...prev, user];
          }
          return prev;
        });
      }

      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    });

    // Handle remote user unpublished
    client.on("user-unpublished", (user, mediaType) => {
      console.log("📤 User unpublished:", user.uid, mediaType);

      if (mediaType === "video") {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      }
    });

    // Handle user left
    client.on("user-left", (user) => {
      console.log("👋 User left:", user.uid);
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    // Join channel
    const joinChannel = async () => {
      try {
        setError(null);

        // Create local tracks
        console.log("🎥 Creating camera and microphone tracks...");
        localAudioTrackRef.current =
          await AgoraRTC.createMicrophoneAudioTrack();
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();

        console.log("✅ Local tracks created:", {
          video: !!localVideoTrackRef.current,
          audio: !!localAudioTrackRef.current,
        });

        // Update state to trigger re-render - use setTimeout to ensure DOM is ready
        setTimeout(() => {
          setLocalVideoTrack(localVideoTrackRef.current);
          setLocalAudioTrack(localAudioTrackRef.current);
        }, 0);

        // Join channel with UID (convert userId string to number)
        // Use a hash of the userId to get a consistent numeric UID
        let agoraUID = 0;
        if (userId) {
          for (let i = 0; i < userId.length; i++) {
            agoraUID = (agoraUID << 5) - agoraUID + userId.charCodeAt(i);
            agoraUID = agoraUID & agoraUID; // Convert to 32-bit integer
          }
          agoraUID = Math.abs(agoraUID) || 1; // Ensure positive and non-zero
        }

        // Validate App ID
        if (
          !AGORA_CONFIG.appId ||
          typeof AGORA_CONFIG.appId !== "string" ||
          AGORA_CONFIG.appId.length < 10
        ) {
          throw new Error(
            "Invalid Agora App ID. Please check your VITE_AGORA_APP_ID environment variable."
          );
        }

        console.log(
          "🔌 Joining Agora channel:",
          channelName,
          "with UID:",
          agoraUID,
          "App ID:",
          AGORA_CONFIG.appId.substring(0, 8) + "..." // Only show first 8 chars for security
        );

        // Join channel - use null token for development/testing
        // For production, generate tokens server-side
        // Agora SDK requires null (not undefined) when not using token
        const token = AGORA_CONFIG.token || null;

        try {
          // Join with explicit error handling for gateway issues
          console.log("🔌 Attempting to join Agora channel...", {
            channel: channelName,
            uid: agoraUID,
            hasToken: !!token,
            region: AGORA_CONFIG.region,
          });

          await client.join(AGORA_CONFIG.appId, channelName, token, agoraUID);
        } catch (joinError: any) {
          // Handle specific gateway server errors (error code 4096 = CAN_NOT_GET_GATEWAY_SERVER)
          if (
            joinError?.message?.includes("GATEWAY_SERVER") ||
            joinError?.message?.includes("CAN_NOT_GET_GATEWAY_SERVER") ||
            joinError?.code === 4096 ||
            joinError?.flag === 4096
          ) {
            const errorMsg = `Cannot connect to Agora gateway servers (Error 4096).
            
Possible solutions:
1. Check your network/firewall - ensure Agora servers are accessible
2. Verify App ID is correct: ${AGORA_CONFIG.appId.substring(0, 8)}...
3. Try setting region in .env: VITE_AGORA_REGION=ASIA (or EUROPE, NORTH_AMERICA, etc.)
4. Check if your network uses a proxy - Agora may need proxy configuration
5. Ensure your App ID is from the correct region

Current App ID length: ${AGORA_CONFIG.appId.length} characters
Current region: ${AGORA_CONFIG.region}`;

            console.error("❌ Gateway server connection failed:", errorMsg);
            setError(errorMsg);
            throw new Error(errorMsg);
          }
          throw joinError;
        }

        // Publish local tracks
        await client.publish([
          localAudioTrackRef.current,
          localVideoTrackRef.current,
        ]);
        console.log("📤 Published local tracks to channel");

        setIsConnected(true);
        console.log("✅ Agora joined channel successfully:", channelName);
      } catch (error: any) {
        console.error("❌ Error joining Agora channel:", error);
        setError(error?.message || "Failed to join video call");
        setIsConnected(false);

        // Clean up tracks on error
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
          setLocalVideoTrack(null);
        }
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
          setLocalAudioTrack(null);
        }
      }
    };

    joinChannel();

    return () => {
      // Cleanup
      const cleanup = async () => {
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
          setLocalVideoTrack(null);
        }

        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
          setLocalAudioTrack(null);
        }

        if (clientRef.current) {
          await clientRef.current.leave();
          clientRef.current = null;
        }

        setIsConnected(false);
        setRemoteUsers([]);
        setError(null);
      };

      cleanup();
    };
  }, [channelName, userId, enabled]);

  // Handle video toggle
  const toggleVideo = useCallback(async (enabled: boolean) => {
    setIsVideoOn(enabled);

    if (localVideoTrackRef.current) {
      try {
        if (enabled) {
          await localVideoTrackRef.current.setEnabled(true);
        } else {
          await localVideoTrackRef.current.setEnabled(false);
        }
      } catch (error) {
        console.error("Error toggling video:", error);
      }
    }
  }, []);

  // Handle audio toggle
  const toggleAudio = useCallback(async (enabled: boolean) => {
    setIsAudioOn(enabled);

    if (localAudioTrackRef.current) {
      try {
        if (enabled) {
          await localAudioTrackRef.current.setEnabled(true);
        } else {
          await localAudioTrackRef.current.setEnabled(false);
        }
      } catch (error) {
        console.error("Error toggling audio:", error);
      }
    }
  }, []);

  // Play local video in element - will be called by component
  const playLocalVideo = useCallback(
    (element: HTMLVideoElement | null) => {
      const track = localVideoTrack || localVideoTrackRef.current;
      if (element && track) {
        try {
          console.log("🎥 Attempting to play local video track in element", {
            elementReady: !!element,
            trackReady: !!track,
            trackEnabled:
              track.isPlaying !== undefined ? track.isPlaying : "unknown",
          });

          // Play the track in the element
          track
            .play(element)
            .then(() => {
              console.log("✅ Local video track playing successfully");
            })
            .catch((err: any) => {
              console.error("❌ Error playing local video:", err);
              // Retry once after a short delay
              setTimeout(() => {
                track.play(element).catch((retryErr: any) => {
                  console.error("❌ Retry failed:", retryErr);
                });
              }, 500);
            });
        } catch (error) {
          console.error("❌ Error setting up local video:", error);
        }
      } else {
        console.warn("⚠️ Cannot play local video - missing element or track:", {
          hasElement: !!element,
          hasTrack: !!track,
          trackFromState: !!localVideoTrack,
          trackFromRef: !!localVideoTrackRef.current,
        });
      }
    },
    [localVideoTrack]
  );

  // Play remote video in element
  const playRemoteVideo = useCallback(
    (user: any, element: HTMLVideoElement | null) => {
      if (element && user.videoTrack) {
        try {
          user.videoTrack.play(element).catch((err: any) => {
            console.error("Error playing remote video:", err);
          });
        } catch (error) {
          console.error("Error setting up remote video:", error);
        }
      }
    },
    []
  );

  return {
    isConnected,
    remoteUsers,
    isVideoOn,
    isAudioOn,
    toggleVideo,
    toggleAudio,
    playLocalVideo,
    playRemoteVideo,
    localVideoTrack,
    localAudioTrack,
    error,
  };
}
