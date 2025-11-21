import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Share2 } from "lucide-react";
import { format } from "date-fns";

export default function Transcripts() {
  const { transcripts } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Transcripts</h1>
        <p className="text-muted-foreground mt-1">Access and download auto-generated meeting records.</p>
      </div>

      <div className="grid gap-4">
        {transcripts.map(t => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Meeting Transcript - {format(new Date(t.date), "PPP")}</CardTitle>
                  <p className="text-sm text-muted-foreground">Participants: {t.participants.join(", ")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
                <Button size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-md text-sm font-mono text-muted-foreground line-clamp-3">
                {t.content}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
