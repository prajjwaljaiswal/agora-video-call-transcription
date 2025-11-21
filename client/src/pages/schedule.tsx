import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Schedule() {
  const { users, cases, addMeeting } = useStore();
  const [, setLocation] = useLocation();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  const suggestedTimes = [
    "09:00", "11:30", "14:00", "15:30"
  ];

  const handleSchedule = () => {
    if (!date) return;
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const meetingDate = setMinutes(setHours(date, hours), minutes);
    
    const newMeeting = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Assessment - ${cases.find(c => c.id === selectedCase)?.clientName || 'New Client'}`,
      date: meetingDate,
      duration: 60,
      attendees: selectedAttendees,
      caseId: selectedCase,
      status: 'scheduled' as const,
      hasTranscript: false
    };
    
    addMeeting(newMeeting);
    setLocation("/");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Schedule Assessment</h1>
        <p className="text-muted-foreground mt-1">Set up a secure video meeting with experts and clients.</p>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>All parties will receive a secure link automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-2">
            <Label>Select Case</Label>
            <Select onValueChange={setSelectedCase} value={selectedCase}>
              <SelectTrigger>
                <SelectValue placeholder="Select active case..." />
              </SelectTrigger>
              <SelectContent>
                {cases.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title} ({c.reference})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Suggested Times (Expert Available)</Label>
              <div className="grid grid-cols-2 gap-2">
                {suggestedTimes.map(time => (
                  <Button 
                    key={time} 
                    variant={selectedTime === time ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attendees</Label>
            <div className="border rounded-md p-4 space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id={`user-${user.id}`}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAttendees([...selectedAttendees, user.id]);
                      } else {
                        setSelectedAttendees(selectedAttendees.filter(id => id !== user.id));
                      }
                    }}
                  />
                  <Label htmlFor={`user-${user.id}`} className="flex items-center gap-2 cursor-pointer font-normal">
                    <img src={user.avatar} alt="" className="w-6 h-6 rounded-full" />
                    {user.name} <span className="text-muted-foreground text-xs">({user.role})</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setLocation("/")}>Cancel</Button>
            <Button onClick={handleSchedule} className="gap-2">
              <Video className="w-4 h-4" />
              Schedule Meeting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
