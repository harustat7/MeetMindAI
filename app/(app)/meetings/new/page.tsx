import { ArrowLeft, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewMeetingPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <header className="mb-5 flex items-center justify-between gap-3 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">New Meeting</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a meeting without connecting a calendar.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </a>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Meeting details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/meetings" method="post" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Product planning call" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={today()} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startsAt">Start</Label>
                <Input id="startsAt" name="startsAt" type="time" defaultValue="10:00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">End</Label>
                <Input id="endsAt" name="endsAt" type="time" defaultValue="10:45" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="Zoom, office, meet link..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees</Label>
                <Input id="attendees" name="attendees" placeholder="alice@company.com, Bob <bob@company.com>" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" className="min-h-[90px]" placeholder="Agenda or context..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript or notes</Label>
              <Textarea id="transcript" name="transcript" className="min-h-[180px]" placeholder="Paste notes or transcript. You can also add this later." />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button asChild variant="outline">
                <a href="/dashboard">Cancel</a>
              </Button>
              <Button type="submit">Create meeting</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
