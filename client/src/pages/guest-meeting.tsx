import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useLiveMeeting } from "@/hooks/use-live-meeting";
import { useAgoraVideo } from "@/hooks/use-agora-video";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function GuestMeeting() {
  const [, params] = useRoute("/meet/guest/:id");
  const [, setLocation] = useLocation();
  const { meetings } = useStore();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Always use the meeting ID from URL params to ensure sync with host
  const meetingId = params?.id;
  const meeting = meetings.find((m) => m.id === meetingId) || {
    title: "Legal Assessment Meeting",
    id: meetingId || "demo",
  };

  // CRITICAL: Use meetingId from params directly to ensure sync - even if meeting not found in store
  const {
    participants,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleVideo,
    localParticipantId,
    isConnected,
  } = useLiveMeeting(meetingId);

  // Agora video calling - use meetingId as channel name and localParticipantId as userId
  const agoraVideo = useAgoraVideo(
    meetingId,
    localParticipantId || undefined,
    !!meetingId && !!localParticipantId && joined
  );

  // Sync local media state to shared state when user changes it
  // Only sync when isMicOn or isVideoOn changes (user interaction), not when participants updates from server
  useEffect(() => {
    if (!joined || !localParticipantId) return;
    // Sync mic state: isMicOn=true means not muted, so we want isMuted=false
    toggleMic(!isMicOn);
    // Also sync with Agora
    if (agoraVideo.toggleAudio) {
      agoraVideo.toggleAudio(isMicOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicOn, joined, localParticipantId]); // Intentionally omit toggleMic and participants to avoid loops

  useEffect(() => {
    if (!joined || !localParticipantId) return;
    // Sync video state: isVideoOn=true means video on, so we want isVideoOff=false
    toggleVideo(!isVideoOn);
    // Also sync with Agora
    if (agoraVideo.toggleVideo) {
      agoraVideo.toggleVideo(isVideoOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOn, joined, localParticipantId]); // Intentionally omit toggleVideo and participants to avoid loops

  // Play local Agora video when track is ready or element is available
  useEffect(() => {
    if (!agoraVideo.localVideoTrack) {
      console.log("⏳ Waiting for local video track (guest)...");
      return;
    }

    const playVideo = () => {
      const element = localVideoRef.current;
      if (element) {
        console.log("🎬 Element ready (guest), playing local video track");
        agoraVideo.playLocalVideo(element);
      } else {
        console.warn("⚠️ Video element not ready yet (guest)");
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

  // Play remote Agora videos when users join
  useEffect(() => {
    agoraVideo.remoteUsers.forEach((user) => {
      const videoElement = remoteVideoRefs.current.get(user.uid.toString());
      if (videoElement && user.videoTrack) {
        agoraVideo.playRemoteVideo(user, videoElement);
      }
    });
  }, [agoraVideo.remoteUsers, agoraVideo.playRemoteVideo]);

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

  // Cleanup on leave
  useEffect(() => {
    return () => {
      if (joined) leaveMeeting();
    };
  }, [joined]);

  const handleJoin = () => {
    if (!name.trim()) {
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
    const participantId = joinMeeting(name, "guest");

    if (participantId) {
      setJoined(true);
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

  const remoteParticipants = participants.filter(
    (p) => p.id !== localParticipantId
  );

  if (joined) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="font-bold">{meeting.title}</span>
            <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              Guest Access
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              leaveMeeting();
              setLocation("/");
            }}
          >
            <PhoneOff className="w-4 h-4 mr-2" /> Leave
          </Button>
        </header>

        <div className="flex-1 p-4 grid md:grid-cols-2 gap-4 max-w-6xl mx-auto w-full">
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
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">
              You ({name})
            </div>
          </Card>

          {/* Other Participants */}
          {remoteParticipants.map((p) => (
            <Card
              key={p.id}
              className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center"
            >
              {/* Simulate remote video */}
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
              <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm flex items-center gap-2">
                {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                {p.name} {p.role === "host" && "(Host)"}
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
        </div>
      </div>
    );
  }

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
            <p className="font-medium">{meeting.title}</p>
            <p className="text-muted-foreground mt-1">
              Secure Gateway Connection
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Full Name</Label>
            <Input
              id="name"
              placeholder="e.g. Dr. John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full h-11 text-base gap-2"
              onClick={handleJoin}
              disabled={!meetingId || !name.trim()}
            >
              <UserCheck className="w-4 h-4" />
              {isConnected ? "Join Meeting Now" : "Join Meeting Now"}
            </Button>
            {!isConnected && meetingId && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">
                {isConnected ? "Connected" : "Connecting to meeting server..."}
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
