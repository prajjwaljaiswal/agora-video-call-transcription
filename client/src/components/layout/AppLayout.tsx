import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const isGuestRoute = location.startsWith("/meet/guest");

  if (isGuestRoute) {
    return (
      <div className="min-h-screen bg-background w-full animate-in fade-in duration-300">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-muted/20 scroll-smooth">
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
