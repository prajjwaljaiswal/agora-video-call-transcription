import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useLiveMeeting } from "@/hooks/use-live-meeting";
import { useAgoraVideo } from "@/hooks/use-agora-video";
import { useTranscription, TranscriptSegment } from "@/hooks/use-transcription";
import { AGORA_CONFIG } from "@/config/agora";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Share,
  Users,
  FileText,
  Copy,
  Check,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MeetingRoom() {
  const [, hostParams] = useRoute("/meeting/:id");
  const [, guestParams] = useRoute("/meet/guest/:id");
  const [, setLocation] = useLocation();
  const { meetings, generateTranscript, currentUser } = useStore();
  const { toast } = useToast();

  // Determine if this is a guest route
  const isGuest = !!guestParams;
  const params = isGuest ? guestParams : hostParams;

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [copied, setCopied] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestJoined, setGuestJoined] = useState(false);
  const [guestShowTranscript, setGuestShowTranscript] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Always use meeting ID from URL params to ensure sync with guests
  const meetingId = params?.id;
  const meeting =
    meetings.find((m) => m.id === meetingId) ||
    (isGuest
      ? {
          title: "Legal Assessment Meeting",
          id: meetingId || "demo",
        }
      : undefined);

  // CRITICAL: Use meetingId from params directly to ensure sync - same as guest page
  const {
    participants,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleVideo,
    localParticipantId,
    isConnected,
    socket,
  } = useLiveMeeting(meetingId);

  // Merged transcript state (local + remote segments)
  const [mergedTranscriptSegments, setMergedTranscriptSegments] = useState<
    TranscriptSegment[]
  >([]);

  // Agora video calling - use meetingId as channel name and localParticipantId as userId
  const agoraVideo = useAgoraVideo(
    meetingId,
    localParticipantId || undefined,
    !!meetingId && !!localParticipantId && (!isGuest || guestJoined)
  );

  // Callback to share local transcript segments via Socket.IO
  const handleLocalTranscriptSegment = useCallback(
    (segment: TranscriptSegment) => {
      if (socket && socket.connected && meetingId) {
        socket.emit("transcriptSegment", {
          meetingId,
          segment: {
            ...segment,
            speaker: isGuest ? guestName : currentUser?.name || "You",
          },
        });
        console.log("📤 Shared transcript segment:", segment);
      }
    },
    [socket, meetingId, isGuest, guestName, currentUser]
  );

  // Transcription - works independently using Web Speech API (needs direct mic access)
  // Enable when mic is on and we're in a meeting (both hosts and guests)
  const transcription = useTranscription(
    null, // Not used - Web Speech API accesses mic directly
    isGuest ? guestName : currentUser?.name || "You",
    !!meetingId && isMicOn && (!isGuest || guestJoined),
    handleLocalTranscriptSegment
  );

  // Auto-join as host when entering the room
  useEffect(() => {
    if (!isGuest && meetingId && !localParticipantId && currentUser) {
      joinMeeting(currentUser.name || "Solicitor (Host)", "host");
    }
    // Cleanup on unmount
    return () => {
      if (localParticipantId) {
        leaveMeeting();
      }
    };
  }, [
    meetingId,
    localParticipantId,
    currentUser,
    joinMeeting,
    leaveMeeting,
    isGuest,
  ]);

  // Sync local media state to shared state when user changes it
  // Only sync when isMicOn or isVideoOn changes (user interaction), not when participants updates from server
  useEffect(() => {
    if (!localParticipantId || (isGuest && !guestJoined)) return;
    // Sync mic state: isMicOn=true means not muted, so we want isMuted=false
    toggleMic(!isMicOn);
    // Also sync with Agora
    if (agoraVideo.toggleAudio) {
      agoraVideo.toggleAudio(isMicOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicOn, localParticipantId, isGuest, guestJoined]); // Intentionally omit toggleMic and participants to avoid loops

  useEffect(() => {
    if (!localParticipantId || (isGuest && !guestJoined)) return;
    // Sync video state: isVideoOn=true means video on, so we want isVideoOff=false
    toggleVideo(!isVideoOn);
    // Also sync with Agora
    if (agoraVideo.toggleVideo) {
      agoraVideo.toggleVideo(isVideoOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOn, localParticipantId, isGuest, guestJoined]); // Intentionally omit toggleVideo and participants to avoid loops

  // Play local Agora video when track is ready or element is available
  useEffect(() => {
    if (!agoraVideo.localVideoTrack) {
      console.log("⏳ Waiting for local video track...");
      return;
    }

    const playVideo = () => {
      const element = localVideoRef.current;
      if (element) {
        console.log("🎬 Element ready, playing local video track");
        agoraVideo.playLocalVideo(element);
      } else {
        console.warn("⚠️ Video element not ready yet");
      }
    };

    // Try immediately
    playVideo();

    // Also try after a short delay in case element isn't ready
    const timeoutId = setTimeout(() => {
      playVideo();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [agoraVideo.localVideoTrack, agoraVideo.playLocalVideo]);

  // Show error if Agora fails
  useEffect(() => {
    if (agoraVideo.error) {
      toast({
        title: "Video Call Error",
        description: agoraVideo.error,
        variant: "destructive",
      });
    }
  }, [agoraVideo.error, toast]);

  // Play remote Agora videos when users join
  useEffect(() => {
    agoraVideo.remoteUsers.forEach((user) => {
      const videoElement = remoteVideoRefs.current.get(user.uid.toString());
      if (videoElement && user.videoTrack) {
        agoraVideo.playRemoteVideo(user, videoElement);
      }
    });
  }, [agoraVideo.remoteUsers, agoraVideo.playRemoteVideo]);

  // Debug: Log participants to see what we have
  useEffect(() => {
    console.log("📋 Meeting participants:", {
      total: participants.length,
      localId: localParticipantId,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      })),
    });
  }, [participants, localParticipantId]);

  // Listen for remote transcript segments via Socket.IO
  useEffect(() => {
    if (!socket || !meetingId) return;

    const handleRemoteTranscriptSegment = (data: {
      meetingId: string;
      segment: TranscriptSegment;
    }) => {
      if (data.meetingId === meetingId) {
        console.log("📥 Received remote transcript segment:", data.segment);
        setMergedTranscriptSegments((prev) => {
          // Check if segment already exists (avoid duplicates)
          const exists = prev.find((s) => s.id === data.segment.id);
          if (exists) return prev;

          // Add remote segment and sort by timestamp
          const updated = [...prev, data.segment];
          return updated.sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    };

    socket.on("transcriptSegment", handleRemoteTranscriptSegment);

    return () => {
      socket.off("transcriptSegment", handleRemoteTranscriptSegment);
    };
  }, [socket, meetingId]);

  // Merge local transcription segments with remote segments
  useEffect(() => {
    setMergedTranscriptSegments((prev) => {
      // Get all local segments
      const localSegments = transcription.segments;

      // Filter out local segments that are already in merged (by ID)
      const remoteOnly = prev.filter(
        (s) => !localSegments.some((ls) => ls.id === s.id)
      );

      // Combine remote segments with local segments and sort by timestamp
      const merged = [...remoteOnly, ...localSegments];
      return merged.sort((a, b) => a.timestamp - b.timestamp);
    });
  }, [transcription.segments]);

  const handleGuestJoin = () => {
    if (!guestName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name to join.",
        variant: "destructive",
      });
      return;
    }

    if (!meetingId) {
      toast({
        title: "Meeting ID Required",
        description: "Invalid meeting link.",
        variant: "destructive",
      });
      return;
    }

    // Join the meeting (will send via Socket.IO when connected)
    const participantId = joinMeeting(guestName, "guest");

    if (participantId) {
      setGuestJoined(true);
      toast({
        title: "Joining Meeting",
        description: isConnected
          ? "Connected to secure session."
          : "Connecting to secure session...",
        variant: "default",
      });
    } else {
      toast({
        title: "Failed to Join",
        description: "Could not join the meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async () => {
    if (meeting && !isGuest) {
      // Get full transcript before ending (hosts only)
      const fullTranscript = transcription.getFullTranscript();
      const participantNames = participants.map((p) => p.name);

      // Save transcript if we have content
      if (fullTranscript.trim()) {
        try {
          const response = await fetch("/api/transcripts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingId: meeting.id,
              content: fullTranscript,
              participants: participantNames,
            }),
          });

          if (response.ok) {
            toast({
              title: "Transcript Saved",
              description: "Meeting transcript has been saved successfully.",
            });
          } else {
            console.error("Failed to save transcript");
          }
        } catch (err) {
          console.error("Error saving transcript:", err);
        }
      }

      generateTranscript(meeting.id);
    }

    transcription.stopTranscription();

    console.log("Stopping transcription and ending call");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const microphone = stream
      .getAudioTracks()
      .forEach((t) => (t.enabled = false));

    // navigator.mediaDevices.getUserMedia({ audio: false });
    console.log("Microphone:", microphone);

    leaveMeeting();
    setLocation("/");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      window.location.origin + `/meet/guest/${meetingId}`
    );
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Guest invitation link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Show guest join form if not joined yet
  if (isGuest && !guestJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full shadow-lg border-t-4 border-t-primary">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Join Meeting</CardTitle>
            <CardDescription>
              You have been invited to a secure legal assessment meeting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg text-sm text-center">
              <p className="font-medium">
                {meeting?.title || "Legal Assessment Meeting"}
              </p>
              <p className="text-muted-foreground mt-1">
                Secure Gateway Connection
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Dr. John Smith"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && guestName.trim() && meetingId) {
                    handleGuestJoin();
                  }
                }}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Button
                className="w-full h-11 text-base gap-2"
                onClick={handleGuestJoin}
                disabled={!meetingId || !guestName.trim()}
              >
                <UserCheck className="w-4 h-4" />
                {isConnected ? "Join Meeting Now" : "Join Meeting Now"}
              </Button>
              {!isConnected && meetingId && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  {isConnected
                    ? "Connected"
                    : "Connecting to meeting server..."}
                </p>
              )}
              <p className="text-xs text-center text-muted-foreground">
                By joining, you agree to the recording of this session for legal
                transcription purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting && !isGuest) return <div className="p-8">Meeting not found</div>;

  // Filter participants to show grid
  // If it's just me, show me large. If others, show grid.
  // We always show "Me" as the first card (local view)
  // Include local participant in the count and ensure it's synced
  const remoteParticipants = participants.filter(
    (p) => p.id !== localParticipantId
  );

  // Guest layout (full screen)
  if (isGuest) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="font-bold">
              {meeting?.title || "Legal Assessment Meeting"}
            </span>
            <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              Guest Access
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleEndCall}>
            <PhoneOff className="w-4 h-4 mr-2" /> Leave
          </Button>
        </header>

        <div className="flex-1 flex gap-4 p-4 min-h-0 max-w-7xl mx-auto w-full">
          {/* Main Video Grid */}
          <div
            className={cn(
              "flex-1 grid gap-4",
              remoteParticipants.length === 0
                ? "grid-cols-1"
                : remoteParticipants.length === 1
                ? "grid-cols-1"
                : "grid-cols-2"
            )}
          >
            {/* Guest Self View - Local Video from Agora */}
            <Card className="bg-black border-none relative overflow-hidden flex items-center justify-center group">
              {/* Agora Local Video - Always render video element, but only show when track exists */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transform scale-x-[-1]",
                  (!agoraVideo.localVideoTrack || !isVideoOn) && "hidden"
                )}
              />
              {(!agoraVideo.localVideoTrack || !isVideoOn) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {guestName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">
                You ({guestName})
              </div>
            </Card>

            {/* Other Participants */}
            {remoteParticipants.map((p) => {
              const agoraUser = agoraVideo.remoteUsers.find(
                (u, idx) => idx < remoteParticipants.length
              );
              const hasAgoraVideo = agoraUser?.videoTrack;

              return (
                <Card
                  key={p.id}
                  className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center"
                >
                  {/* Agora Remote Video if available */}
                  {hasAgoraVideo && agoraUser && (
                    <video
                      ref={(el) => {
                        if (el) {
                          remoteVideoRefs.current.set(
                            agoraUser.uid.toString(),
                            el
                          );
                          agoraVideo.playRemoteVideo(agoraUser, el);
                        } else {
                          remoteVideoRefs.current.delete(
                            agoraUser.uid.toString()
                          );
                        }
                      }}
                      autoPlay
                      playsInline
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover",
                        p.isVideoOff && "hidden"
                      )}
                    />
                  )}

                  {/* Fallback if no Agora video or video is off */}
                  {(!hasAgoraVideo || p.isVideoOff) && (
                    <>
                      {p.isVideoOff ? (
                        <div className="absolute inset-0 bg-sidebar flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-sidebar-primary flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                              {p.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                          className="absolute inset-0 w-full h-full object-cover bg-slate-200"
                          alt={p.name}
                        />
                      )}
                    </>
                  )}

                  <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm flex items-center gap-2">
                    {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                    {p.name} {p.role === "host" && "(Host)"}
                  </div>
                </Card>
              );
            })}

            {/* Show Agora remote users that aren't in participants list yet */}
            {agoraVideo.remoteUsers
              .filter((agoraUser, idx) => idx >= remoteParticipants.length)
              .map((agoraUser) => (
                <Card
                  key={`agora-${agoraUser.uid}`}
                  className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center"
                >
                  {agoraUser.videoTrack && (
                    <video
                      ref={(el) => {
                        if (el) {
                          remoteVideoRefs.current.set(
                            agoraUser.uid.toString(),
                            el
                          );
                          agoraVideo.playRemoteVideo(agoraUser, el);
                        } else {
                          remoteVideoRefs.current.delete(
                            agoraUser.uid.toString()
                          );
                        }
                      }}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">
                    <p className="font-medium">User {agoraUser.uid}</p>
                  </div>
                </Card>
              ))}

            {/* Simulated Host (if no real participants connected) */}
            {remoteParticipants.length === 0 && (
              <Card className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=60"
                  className="absolute inset-0 w-full h-full object-cover opacity-90"
                  alt="Solicitor (Host)"
                />
                <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm flex items-center gap-2">
                  <Video className="w-3 h-3 text-green-400" />
                  Solicitor (Host)
                </div>
              </Card>
            )}
          </div>

          {/* Side Panel (Transcript/Chat) - Guests */}
          {guestShowTranscript && (
            <Card className="w-80 flex flex-col border-l shadow-none rounded-none md:rounded-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Live Transcript
                  {transcription.isListening && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
                  )}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (transcription.isListening) {
                      transcription.stopTranscription();
                    } else {
                      transcription.startTranscription();
                    }
                  }}
                  className="text-xs"
                >
                  {transcription.isListening ? "Stop" : "Start"}
                </Button>
              </div>
              <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm">
                {transcription.segments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {transcription.error ? (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive font-medium">
                          {transcription.error}
                        </p>
                        {transcription.error.includes("permission") && (
                          <p className="text-xs mt-2">
                            Click the microphone icon in your browser's address
                            bar to allow access.
                          </p>
                        )}
                      </div>
                    ) : transcription.isListening ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <p className="text-xs">Listening for speech...</p>
                        </div>
                        <p className="text-xs opacity-60 mt-2">
                          Start speaking to see transcript
                        </p>
                        <p className="text-xs opacity-40 mt-4">
                          💡 Tip: Speak clearly and wait a moment for results
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs">Initializing transcription...</p>
                        {!isMicOn && (
                          <p className="text-xs text-yellow-600 mt-2">
                            Turn on your microphone to enable transcription
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => transcription.startTranscription()}
                          className="mt-4 w-full"
                        >
                          Start Transcription
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  mergedTranscriptSegments.map((segment) => (
                    <div
                      key={segment.id}
                      className={cn(
                        "space-y-1",
                        !segment.isFinal && "opacity-60"
                      )}
                    >
                      <p className="font-semibold text-xs text-primary">
                        {segment.speaker}{" "}
                        <span className="text-muted-foreground font-normal ml-1">
                          {new Date(segment.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {!segment.isFinal && " (speaking...)"}
                        </span>
                      </p>
                      <p className="text-muted-foreground">{segment.text}</p>
                    </div>
                  ))
                )}
                {transcription.error && (
                  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                    {transcription.error}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="h-24 flex items-center justify-center gap-4 bg-card border-t">
          <Button
            size="icon"
            variant={isMicOn ? "secondary" : "destructive"}
            onClick={() => setIsMicOn(!isMicOn)}
            className="h-12 w-12 rounded-full"
          >
            {isMicOn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>
          <Button
            size="icon"
            variant={isVideoOn ? "secondary" : "destructive"}
            onClick={() => setIsVideoOn(!isVideoOn)}
            className="h-12 w-12 rounded-full"
          >
            {isVideoOn ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </Button>
          <Button
            size="icon"
            variant={guestShowTranscript ? "secondary" : "ghost"}
            onClick={() => setGuestShowTranscript(!guestShowTranscript)}
            className="h-12 w-12 rounded-full"
          >
            <FileText className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Host layout (within app layout)
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-bold font-serif">{meeting?.title}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span
              className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                agoraVideo.isConnected ? "bg-green-500" : "bg-yellow-500"
              )}
            ></span>
            {agoraVideo.isConnected ? "Video Connected" : "Connecting..."} •
            {participants.length} Participant{participants.length !== 1 && "s"}
            {!AGORA_CONFIG.appId && (
              <span className="text-yellow-600 text-xs">
                ⚠️ Agora not configured
              </span>
            )}
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Share className="w-4 h-4" /> Invite Guest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Guest</DialogTitle>
              <DialogDescription>
                Share this secure link to invite external participants (experts,
                witnesses) to this meeting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Secure Guest Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={window.location.origin + `/meet/guest/${meetingId}`}
                    readOnly
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-yellow-50 p-3 rounded text-yellow-800 border border-yellow-100">
                <strong>Note:</strong> Guests will be placed in a waiting room
                until admitted by the host.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Main Video Grid */}
        <div
          className={cn(
            "flex-1 grid gap-4",
            remoteParticipants.length === 0
              ? "grid-cols-1"
              : remoteParticipants.length === 1
              ? "grid-cols-2"
              : "grid-cols-2 md:grid-cols-3"
          )}
        >
          {/* Self View - Local Video from Agora */}
          <Card className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center group">
            {/* Agora Local Video - Always render video element, but only show when track exists */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "absolute inset-0 w-full h-full object-cover transform scale-x-[-1]",
                (!agoraVideo.localVideoTrack || !isVideoOn) && "hidden"
              )}
            />

            {/* Fallback if Agora not configured or video off */}
            {(!agoraVideo.localVideoTrack || !isVideoOn) && (
              <>
                {/* Fallback Image */}
                {!agoraVideo.localVideoTrack && (
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=60"
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover",
                      isVideoOn && "hidden"
                    )}
                    alt="Participant"
                  />
                )}
                {/* Avatar when video off */}
                {!isVideoOn && (
                  <div className="absolute inset-0 bg-sidebar flex items-center justify-center z-30">
                    <div className="w-20 h-20 rounded-full bg-sidebar-primary flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {(currentUser?.name || "You").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-2 py-1 rounded text-sm backdrop-blur-sm">
              <p className="font-medium">You ({currentUser?.name || "Host"})</p>
            </div>
          </Card>

          {/* Remote Participants - Show both Socket.IO participants and Agora remote users */}
          {remoteParticipants.map((p) => {
            // Try to match Agora remote user with Socket.IO participant by finding user with similar name
            // For now, we'll show both Socket.IO participants and Agora remote users
            const agoraUser = agoraVideo.remoteUsers.find(
              (u, idx) => idx < remoteParticipants.length
            );
            const hasAgoraVideo = agoraUser?.videoTrack;

            return (
              <Card
                key={p.id}
                className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center"
              >
                {/* Agora Remote Video if available */}
                {hasAgoraVideo && agoraUser && (
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(
                          agoraUser.uid.toString(),
                          el
                        );
                        agoraVideo.playRemoteVideo(agoraUser, el);
                      } else {
                        remoteVideoRefs.current.delete(
                          agoraUser.uid.toString()
                        );
                      }
                    }}
                    autoPlay
                    playsInline
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover",
                      p.isVideoOff && "hidden"
                    )}
                  />
                )}

                {/* Fallback if no Agora video or video is off */}
                {(!hasAgoraVideo || p.isVideoOff) && (
                  <>
                    {p.isVideoOff ? (
                      <div className="absolute inset-0 bg-sidebar flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-sidebar-primary flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">
                            {p.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                        className="absolute inset-0 w-full h-full object-cover bg-slate-200"
                        alt={p.name}
                      />
                    )}
                  </>
                )}

                <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm flex items-center gap-2">
                  {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                  <p className="font-medium">
                    {p.name} {p.role === "guest" && "(Guest)"}
                  </p>
                </div>
              </Card>
            );
          })}

          {/* Show Agora remote users that aren't in participants list yet */}
          {agoraVideo.remoteUsers
            .filter((agoraUser, idx) => idx >= remoteParticipants.length)
            .map((agoraUser) => (
              <Card
                key={`agora-${agoraUser.uid}`}
                className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center"
              >
                {agoraUser.videoTrack && (
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(
                          agoraUser.uid.toString(),
                          el
                        );
                        agoraVideo.playRemoteVideo(agoraUser, el);
                      } else {
                        remoteVideoRefs.current.delete(
                          agoraUser.uid.toString()
                        );
                      }
                    }}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">
                  <p className="font-medium">User {agoraUser.uid}</p>
                </div>
              </Card>
            ))}

          {/* Show placeholder if waiting for others and none joined */}
          {remoteParticipants.length === 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-muted-foreground bg-background/80 p-6 rounded-xl backdrop-blur shadow-lg pointer-events-none">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <h3 className="font-medium">Waiting for others to join...</h3>
              <p className="text-sm">
                Share the guest link to invite participants
              </p>
            </div>
          )}
        </div>

        {/* Side Panel (Transcript/Chat) - Hosts only */}
        {showTranscript && !isGuest && (
          <Card className="w-80 flex flex-col border-l shadow-none rounded-none md:rounded-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Live Transcript
                {transcription.isListening && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (transcription.isListening) {
                    transcription.stopTranscription();
                  } else {
                    transcription.startTranscription();
                  }
                }}
                className="text-xs"
              >
                {transcription.isListening ? "Stop" : "Start"}
              </Button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm">
              {mergedTranscriptSegments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {transcription.error ? (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive font-medium">
                        {transcription.error}
                      </p>
                      {transcription.error.includes("permission") && (
                        <p className="text-xs mt-2">
                          Click the microphone icon in your browser's address
                          bar to allow access.
                        </p>
                      )}
                    </div>
                  ) : transcription.isListening ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-xs">Listening for speech...</p>
                      </div>
                      <p className="text-xs opacity-60 mt-2">
                        Start speaking to see transcript
                      </p>
                      <p className="text-xs opacity-40 mt-4">
                        💡 Tip: Speak clearly and wait a moment for results
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs">Initializing transcription...</p>
                      {!isMicOn && (
                        <p className="text-xs text-yellow-600 mt-2">
                          Turn on your microphone to enable transcription
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => transcription.startTranscription()}
                        className="mt-4 w-full"
                      >
                        Start Transcription
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                mergedTranscriptSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className={cn(
                      "space-y-1",
                      !segment.isFinal && "opacity-60"
                    )}
                  >
                    <p className="font-semibold text-xs text-primary">
                      {segment.speaker}{" "}
                      <span className="text-muted-foreground font-normal ml-1">
                        {new Date(segment.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {!segment.isFinal && " (speaking...)"}
                      </span>
                    </p>
                    <p className="text-muted-foreground">{segment.text}</p>
                  </div>
                ))
              )}
              {transcription.error && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {transcription.error}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 bg-card border rounded-xl shadow-lg flex items-center justify-between px-8 mx-auto max-w-2xl w-full mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMicOn(!isMicOn)}
            className={cn(!isMicOn && "text-destructive bg-destructive/10")}
          >
            {isMicOn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={cn(!isVideoOn && "text-destructive bg-destructive/10")}
          >
            {isVideoOn ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </Button>
        </div>

        <Button
          variant="destructive"
          size="lg"
          className="rounded-full px-8"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-5 h-5 mr-2" /> End Call
        </Button>

        <div className="flex items-center gap-2">
          {!isGuest && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTranscript(!showTranscript)}
              className={cn(showTranscript && "text-primary bg-primary/10")}
            >
              <FileText className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
