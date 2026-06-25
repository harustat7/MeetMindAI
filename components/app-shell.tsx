import Link from "next/link";
import { BarChart3, BookOpen, CalendarDays, CalendarPlus, LayoutDashboard, LogOut, Shield, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background px-4 py-5 md:block">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          MeetMind AI
        </Link>
        <nav className="mt-8 space-y-1">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/calendar">
              <CalendarDays className="h-4 w-4" />
              Calendar Setup
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/meetings/new">
              <CalendarPlus className="h-4 w-4" />
              New Meeting
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/knowledge">
              <BookOpen className="h-4 w-4" />
              Knowledge Base
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/team">
              <Users className="h-4 w-4" />
              Team
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/audit">
              <Shield className="h-4 w-4" />
              Audit
            </Link>
          </Button>
        </nav>
        <div className="absolute bottom-5 left-4 right-4">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/sign-out">
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </Button>
        </div>
      </aside>
      <main className="md:pl-64">{children}</main>
    </div>
  );
}
