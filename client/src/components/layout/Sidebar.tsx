import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, Briefcase, FileText, Settings, LogOut } from "lucide-react";
import generatedImage from '@assets/generated_images/abstract_geometric_legal_technology_logo_symbol.png';

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/schedule", icon: Calendar, label: "Schedule Meeting" },
    { href: "/cases", icon: Briefcase, label: "My Cases" },
    { href: "/transcripts", icon: FileText, label: "Transcripts" },
  ];

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
        <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center overflow-hidden">
          <img src={generatedImage} alt="Gateway Logo" className="w-full h-full object-cover" />
        </div>
        <span className="font-serif text-xl font-bold tracking-tight text-sidebar-primary-foreground">Gateway</span>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 font-medium text-base h-12",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-accent" : "text-sidebar-foreground/50")} />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border/50 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
