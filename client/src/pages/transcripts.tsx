import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Share2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Transcript {
  id: string;
  meetingId: string;
  content: string;
  participants: string[];
  createdAt: string;
}

export default function Transcripts() {
  const { data: transcripts, isLoading, error } = useQuery<Transcript[]>({
    queryKey: ["/api/transcripts"],
  });

  const handleDownloadPDF = (transcript: Transcript) => {
    // Create a simple PDF download
    const content = `Meeting Transcript\n\nDate: ${format(new Date(transcript.createdAt), "PPP")}\nParticipants: ${transcript.participants.join(", ")}\n\n${transcript.content}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${transcript.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Transcripts</h1>
          <p className="text-muted-foreground mt-1">Access and download auto-generated meeting records.</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Transcripts</h1>
          <p className="text-muted-foreground mt-1">Access and download auto-generated meeting records.</p>
        </div>
        <div className="text-center py-12 text-destructive">
          <p>Error loading transcripts. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Transcripts</h1>
        <p className="text-muted-foreground mt-1">Access and download auto-generated meeting records.</p>
      </div>

      {!transcripts || transcripts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No transcripts available yet.</p>
          <p className="text-sm mt-2">Transcripts will appear here after meetings are completed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {transcripts.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Meeting Transcript - {format(new Date(t.createdAt), "PPP")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Participants: {t.participants.length > 0 ? t.participants.join(", ") : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => handleDownloadPDF(t)}>
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 rounded-md text-sm font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {t.content}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
