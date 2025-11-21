import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/dashboard";
import Schedule from "@/pages/schedule";
import MeetingRoom from "@/pages/meeting-room";
import Cases from "@/pages/cases";
import CaseDetails from "@/pages/case-details";
import CalendarPage from "@/pages/calendar";
import Transcripts from "@/pages/transcripts";
import GuestMeeting from "@/pages/guest-meeting";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/meeting/:id" component={MeetingRoom} />
        <Route path="/meet/guest/:id" component={GuestMeeting} />
        <Route path="/cases" component={Cases} />
        <Route path="/cases/:id" component={CaseDetails} />
        <Route path="/transcripts" component={Transcripts} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
