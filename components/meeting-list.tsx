import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type MeetingListItem = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  provider: string | null;
  summary: { id: string } | null;
  attendees: Array<{ id: string }>;
};

export function MeetingList({ meetings }: { meetings: MeetingListItem[] }) {
  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
          <CalendarClock className="h-9 w-9 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">No meetings synced yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Connect a calendar to bring meetings into MeetMind AI.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <Card key={meeting.id}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{meeting.title}</h3>
                <Badge variant={meeting.status === "UPCOMING" ? "secondary" : "muted"}>{meeting.status.toLowerCase()}</Badge>
                {meeting.provider ? <Badge variant="outline">{meeting.provider.toLowerCase()}</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(meeting.startsAt, "MMM d, h:mm a")} - {format(meeting.endsAt, "h:mm a")} · {meeting.attendees.length} attendees
              </p>
            </div>
            <Button asChild variant={meeting.summary ? "outline" : "default"}>
              <Link href={`/meetings/${meeting.id}`}>
                <FileText className="h-4 w-4" />
                Open
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
