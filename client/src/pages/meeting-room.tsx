import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useLiveMeeting } from "@/hooks/use-live-meeting";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Share, Users, FileText, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MeetingRoom() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { meetings, generateTranscript, currentUser } = useStore();
  const { toast } = useToast();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const meeting = meetings.find(m => m.id === params?.id);
  const guestLink = `https://gateway.legal/meet/guest/${meeting?.id || 'demo'}`;

  // Use the live meeting hook to sync participants
  const { participants, joinMeeting, leaveMeeting, toggleMic, toggleVideo, localParticipantId } = useLiveMeeting(meeting?.id);

  // Auto-join as host when entering the room
  useEffect(() => {
    if (meeting && !localParticipantId) {
      joinMeeting(currentUser?.name || "Solicitor (Host)", 'host');
    }
    // Cleanup on unmount
    return () => {
      // Optionally leave? For now we keep them to simulate persistence on refresh, 
      // but technically navigating away should leave.
      leaveMeeting(); 
    };
  }, [meeting?.id]);

  // Sync local media state to shared state
  useEffect(() => {
    toggleMic(!isMicOn);
  }, [isMicOn]);

  useEffect(() => {
    toggleVideo(!isVideoOn);
  }, [isVideoOn]);


  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
          toast({
            title: "Camera Error",
            description: "Could not access your camera. Using avatar instead.",
            variant: "destructive"
          });
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoOn]);

  const handleEndCall = () => {
    if (meeting) {
      generateTranscript(meeting.id);
    }
    leaveMeeting();
    setLocation("/");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.origin + `/meet/guest/${meeting?.id}`);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Guest invitation link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!meeting) return <div className="p-8">Meeting not found</div>;

  // Filter participants to show grid
  // If it's just me, show me large. If others, show grid.
  // We always show "Me" as the first card (local view)
  const remoteParticipants = participants.filter(p => p.id !== localParticipantId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-bold font-serif">{meeting.title}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Encrypted • Recording Active • {participants.length} Participant{participants.length !== 1 && 's'}
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
                Share this secure link to invite external participants (experts, witnesses) to this meeting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Secure Guest Link</Label>
                <div className="flex gap-2">
                  <Input value={window.location.origin + `/meet/guest/${meeting?.id}`} readOnly className="bg-muted/50 font-mono text-sm" />
                  <Button size="icon" variant="outline" onClick={copyToClipboard}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-yellow-50 p-3 rounded text-yellow-800 border border-yellow-100">
                <strong>Note:</strong> Guests will be placed in a waiting room until admitted by the host.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Main Video Grid */}
        <div className={cn("flex-1 grid gap-4", 
          remoteParticipants.length === 0 ? "grid-cols-1" : 
          remoteParticipants.length === 1 ? "grid-cols-2" : 
          "grid-cols-2 md:grid-cols-3"
        )}>
          {/* Self View */}
          <Card className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center group">
            {/* Webcam Video */}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className={cn(
                "absolute inset-0 w-full h-full object-cover mirror-mode transform scale-x-[-1]", 
                !isVideoOn && "hidden"
              )} 
            />
            
            {/* Fallback Image */}
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=60" 
              className={cn("absolute inset-0 w-full h-full object-cover", isVideoOn && "hidden")} 
              alt="Participant" 
            />
            
            <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-2 py-1 rounded text-sm backdrop-blur-sm">
              <p className="font-medium">You ({currentUser?.name})</p>
            </div>
            
            {!isVideoOn && (
               <div className="absolute inset-0 bg-sidebar flex items-center justify-center z-30">
                 <div className="w-20 h-20 rounded-full bg-sidebar-primary flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">You</span>
                 </div>
               </div>
            )}
          </Card>

          {/* Remote Participants */}
          {remoteParticipants.map(p => (
            <Card key={p.id} className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center">
              {/* Simulate remote video with a placeholder image, or random Unsplash */}
              {p.isVideoOff ? (
                 <div className="absolute inset-0 bg-sidebar flex items-center justify-center">
                   <div className="w-20 h-20 rounded-full bg-sidebar-primary flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{p.name.charAt(0)}</span>
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
                <p className="font-medium">{p.name} {p.role === 'guest' && '(Guest)'}</p>
              </div>
            </Card>
          ))}

          {/* Show placeholder if waiting for others and none joined */}
          {remoteParticipants.length === 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-muted-foreground bg-background/80 p-6 rounded-xl backdrop-blur shadow-lg pointer-events-none">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <h3 className="font-medium">Waiting for others to join...</h3>
              <p className="text-sm">Share the guest link to invite participants</p>
            </div>
          )}
        </div>

        {/* Side Panel (Transcript/Chat) */}
        {showTranscript && (
          <Card className="w-80 flex flex-col border-l shadow-none rounded-none md:rounded-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Live Transcript
              </h3>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-xs text-primary">Dr. Alan Grant <span className="text-muted-foreground font-normal ml-1">10:02 AM</span></p>
                <p className="text-muted-foreground">I've reviewed the client's medical history as requested.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-xs text-primary">You <span className="text-muted-foreground font-normal ml-1">10:02 AM</span></p>
                <p className="text-muted-foreground">Excellent. Does the timeline match the incident report?</p>
              </div>
              <div className="space-y-1 opacity-50">
                <p className="font-semibold text-xs text-primary">Dr. Alan Grant <span className="text-muted-foreground font-normal ml-1">Typing...</span></p>
                <p className="text-muted-foreground">Yes, largely. However there is one discrepancy regarding...</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 bg-card border rounded-xl shadow-lg flex items-center justify-between px-8 mx-auto max-w-2xl w-full mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsMicOn(!isMicOn)} className={cn(!isMicOn && "text-destructive bg-destructive/10")}>
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsVideoOn(!isVideoOn)} className={cn(!isVideoOn && "text-destructive bg-destructive/10")}>
             {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
        </div>

        <Button variant="destructive" size="lg" className="rounded-full px-8" onClick={handleEndCall}>
          <PhoneOff className="w-5 h-5 mr-2" /> End Call
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowTranscript(!showTranscript)} className={cn(showTranscript && "text-primary bg-primary/10")}>
            <FileText className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
