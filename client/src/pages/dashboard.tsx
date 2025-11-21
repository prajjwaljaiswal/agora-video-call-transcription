import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, FileText, Plus, ArrowRight, Users } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { meetings, cases, currentUser } = useStore();

  const upcomingMeetings = meetings
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const recentCases = cases.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back, {currentUser?.name.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Here's what's on your agenda for today.</p>
        </div>
        <Link href="/schedule">
          <Button size="lg" className="shadow-lg hover:shadow-xl transition-all gap-2">
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium opacity-90">
              <Video className="w-5 h-5" />
              Next Meeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-4 relative z-10">
                <div>
                  <h3 className="text-2xl font-bold leading-tight">{upcomingMeetings[0].title}</h3>
                  <p className="text-primary-foreground/80 mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(upcomingMeetings[0].date), "h:mm a")} Today
                  </p>
                </div>
                <Link href={`/meeting/${upcomingMeetings[0].id}`}>
                  <Button variant="secondary" className="w-full mt-2 text-primary font-semibold hover:bg-white">
                    Join Now
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-primary-foreground/70">No meetings scheduled today.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-t-4 border-t-accent shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Schedule</CardTitle>
              <CardDescription>Your planned video conferences</CardDescription>
            </div>
            <Link href="/calendar">
              <Button variant="outline" size="sm" className="gap-2">
                View Calendar <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.slice(0, 3).map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                      <span className="text-xs font-bold uppercase">{format(new Date(meeting.date), "MMM")}</span>
                      <span className="text-lg font-bold leading-none">{format(new Date(meeting.date), "dd")}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold group-hover:text-primary transition-colors">{meeting.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(meeting.date), "h:mm a")}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {meeting.attendees.length} Attendees</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/meeting/${meeting.id}`}>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Join
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between pb-4 last:pb-0 last:border-0 border-b border-border/50">
                  <div>
                    <h4 className="font-medium">{c.title}</h4>
                    <p className="text-sm text-muted-foreground">{c.reference} • {c.clientName}</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors cursor-pointer">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium leading-none">Transcript: Estate of H. Croft - Expert Review</h4>
                    <p className="text-xs text-muted-foreground mt-1">Generated on Oct 24 • 45 mins</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
