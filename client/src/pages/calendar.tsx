import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";

export default function CalendarPage() {
  const { meetings } = useStore();
  const [date, setDate] = useState<Date | undefined>(new Date());

  const scheduledDates = meetings.map(m => new Date(m.date));

  return (
    <div className="flex flex-col md:flex-row gap-8 h-[calc(100vh-8rem)]">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">View your upcoming schedule and availability.</p>
        </div>

        <Card className="h-full">
          <CardContent className="p-6 flex justify-center items-start h-full">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow p-8 w-full max-w-xl"
              modifiers={{
                booked: scheduledDates
              }}
              modifiersStyles={{
                booked: { fontWeight: 'bold', color: 'var(--primary)', textDecoration: 'underline' }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="w-full md:w-80 space-y-4">
        <h3 className="font-semibold text-lg">Events for {date ? format(date, "PPP") : "Selected Date"}</h3>
        <div className="space-y-3">
          {meetings
            .filter(m => date && new Date(m.date).toDateString() === date.toDateString())
            .map(m => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={m.status === 'completed' ? 'secondary' : 'default'}>{m.status}</Badge>
                    <span className="text-sm text-muted-foreground">{format(new Date(m.date), "h:mm a")}</span>
                  </div>
                  <h4 className="font-medium leading-tight">{m.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{m.duration} mins</p>
                </CardContent>
              </Card>
            ))}
          {meetings.filter(m => date && new Date(m.date).toDateString() === date.toDateString()).length === 0 && (
            <p className="text-muted-foreground text-sm italic">No events scheduled for this day.</p>
          )}
        </div>
      </div>
    </div>
  );
}
