import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserCheck, ShieldCheck } from "lucide-react";
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
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const meeting = meetings.find(m => m.id === params?.id) || { title: "Legal Assessment Meeting", id: "demo" };

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (joined && isVideoOn) {
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
            description: "Could not access camera.",
            variant: "destructive"
          });
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [joined, isVideoOn]);

  const handleJoin = () => {
    if (!name.trim()) {
      toast({ title: "Name Required", description: "Please enter your full name to join.", variant: "destructive" });
      return;
    }
    setJoined(true);
    toast({ title: "Joining Meeting", description: "Connecting to secure session..." });
  };

  if (joined) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
           <div className="flex items-center gap-2">
             <ShieldCheck className="w-5 h-5 text-green-600" />
             <span className="font-bold">{meeting.title}</span>
             <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">Guest Access</span>
           </div>
           <Button variant="destructive" size="sm" onClick={() => setLocation("/")}>
             <PhoneOff className="w-4 h-4 mr-2" /> Leave
           </Button>
        </header>

        <div className="flex-1 p-4 grid md:grid-cols-2 gap-4 max-w-6xl mx-auto w-full">
           {/* Guest Self View */}
           <Card className="bg-black border-none relative overflow-hidden flex items-center justify-center group">
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
             {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-2xl font-bold">{name.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
             )}
             <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">
               You ({name})
             </div>
           </Card>

           {/* Host View (Simulated) */}
           <Card className="bg-sidebar border-none relative overflow-hidden flex items-center justify-center">
             <img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=800&auto=format&fit=crop&q=60" className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Host" />
             <div className="absolute bottom-4 left-4 z-20 text-white bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">
               Solicitor (Host)
             </div>
           </Card>
        </div>

        <div className="h-24 flex items-center justify-center gap-4 bg-card border-t">
            <Button size="icon" variant={isMicOn ? "secondary" : "destructive"} onClick={() => setIsMicOn(!isMicOn)} className="h-12 w-12 rounded-full">
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant={isVideoOn ? "secondary" : "destructive"} onClick={() => setIsVideoOn(!isVideoOn)} className="h-12 w-12 rounded-full">
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
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
            <p className="text-muted-foreground mt-1">Secure Gateway Connection</p>
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
            <Button className="w-full h-11 text-base gap-2" onClick={handleJoin}>
              <UserCheck className="w-4 h-4" /> Join Meeting Now
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By joining, you agree to the recording of this session for legal transcription purposes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
