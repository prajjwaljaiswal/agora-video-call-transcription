import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/lib/store";
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
  const { meetings, generateTranscript } = useStore();
  const { toast } = useToast();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const meeting = meetings.find(m => m.id === params?.id);
  const guestLink = `https://gateway.legal/meet/guest/${meeting?.id || 'demo'}`;

  useEffect(() => {
    // Simulate transcript generation upon "end meeting" or live
    return () => {
      // Cleanup
    };
  }, []);

  const handleEndCall = () => {
    if (meeting) {
      generateTranscript(meeting.id);
    }
    setLocation("/");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(guestLink);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Guest invitation link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!meeting) return <div className="p-8">Meeting not found</div>;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-bold font-serif">{meeting.title}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Encrypted • Recording Active
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
                  <Input value={guestLink} readOnly className="bg-muted/50 font-mono text-sm" />
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
        <div className="flex-1 grid grid-cols-2 gap-4">
          {/* Self View */}
          <Card className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center group">
            <div className="absolute inset-0 bg-black/40 z-10"></div>
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=60" className="absolute inset-0 w-full h-full object-cover" alt="Participant" />
            <div className="absolute bottom-4 left-4 z-20 text-white">
              <p className="font-medium">You (Solicitor)</p>
            </div>
            {!isVideoOn && (
               <div className="absolute inset-0 bg-sidebar flex items-center justify-center z-30">
                 <div className="w-20 h-20 rounded-full bg-sidebar-primary flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">You</span>
                 </div>
               </div>
            )}
          </Card>

          {/* Other Participant */}
          <Card className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center">
            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=60" className="absolute inset-0 w-full h-full object-cover" alt="Expert" />
            <div className="absolute bottom-4 left-4 z-20 text-white">
              <p className="font-medium">Dr. Alan Grant</p>
            </div>
          </Card>
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
