import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, FolderOpen } from "lucide-react";
import { Link } from "wouter";

export default function Cases() {
  const { cases } = useStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">My Cases</h1>
          <p className="text-muted-foreground mt-1">Manage your active legal cases and assessments.</p>
        </div>
        <Button>
          New Case
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by client name or reference..." className="pl-9" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" /> Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {cases.map(c => (
          <Link key={c.id} href={`/cases/${c.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-secondary-foreground">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{c.title}</h3>
                    <p className="text-muted-foreground">{c.clientName} • Ref: {c.reference}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Assessment Scheduled</Badge>
                      <Badge variant="secondary">Expert Assigned</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Last updated</p>
                  <p className="font-medium">2 days ago</p>
                  <Button variant="ghost" size="sm" className="mt-2">View Details</Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
