import { useRoute } from "wouter";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function CaseDetails() {
  const [, params] = useRoute("/cases/:id");
  const { cases, meetings, transcripts, users } = useStore();
  
  const caseItem = cases.find(c => c.id === params?.id);
  
  if (!caseItem) return <div>Case not found</div>;

  const caseMeetings = meetings.filter(m => m.caseId === caseItem.id);
  const caseTranscripts = transcripts.filter(t => caseMeetings.some(m => m.id === t.meetingId));
  const solicitor = users.find(u => u.id === caseItem.solicitorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold">{caseItem.title}</h1>
          <p className="text-muted-foreground">Ref: {caseItem.reference}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
              <TabsTrigger value="documents">Documents & Transcripts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Client Name</span>
                      <p className="font-medium">{caseItem.clientName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status</span>
                      <p className="font-medium capitalize">{caseItem.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4 mt-4">
              {caseMeetings.map(m => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{m.title}</h4>
                      <p className="text-sm text-muted-foreground">{format(new Date(m.date), "PPP p")}</p>
                    </div>
                    {m.status === 'scheduled' ? (
                      <Link href={`/meeting/${m.id}`}>
                         <Button size="sm" className="gap-2"><Video className="w-4 h-4"/> Join</Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>Completed</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-4 mt-4">
               {caseTranscripts.map(t => (
                 <Card key={t.id}>
                   <CardContent className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <FileText className="w-5 h-5 text-primary" />
                       <div>
                         <h4 className="font-medium">Transcript: {format(new Date(t.date), "PPP")}</h4>
                         <p className="text-sm text-muted-foreground">{t.participants.length} Participants</p>
                       </div>
                     </div>
                     <Button variant="outline" size="sm">Download</Button>
                   </CardContent>
                 </Card>
               ))}
               {caseTranscripts.length === 0 && <p className="text-muted-foreground p-4">No transcripts available yet.</p>}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={solicitor?.avatar} />
                  <AvatarFallback>S</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{solicitor?.name}</p>
                  <p className="text-xs text-muted-foreground">Solicitor (Lead)</p>
                </div>
              </div>
              {caseItem.assignedExperts.map(expertId => {
                const expert = users.find(u => u.id === expertId);
                return (
                  <div key={expertId} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={expert?.avatar} />
                      <AvatarFallback>E</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{expert?.name}</p>
                      <p className="text-xs text-muted-foreground">{expert?.specialty || 'Expert'}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
