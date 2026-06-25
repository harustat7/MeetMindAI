import { NextRequest, NextResponse } from "next/server";
import { CalendarProvider, MeetingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIcsCalendar } from "@/lib/calendar/ics";
import { requireWorkspaceContext } from "@/lib/session";
import { absoluteUrl } from "@/lib/utils";

function meetingStatus(startsAt: Date, endsAt: Date) {
  const now = Date.now();
  if (endsAt.getTime() < now) return MeetingStatus.COMPLETED;
  if (startsAt.getTime() > now) return MeetingStatus.UPCOMING;
  return MeetingStatus.UPCOMING;
}

export async function POST(request: NextRequest) {
  const { user, workspace } = await requireWorkspaceContext();
  const formData = await request.formData();
  const icsUrl = String(formData.get("icsUrl") ?? "").trim();

  if (!icsUrl || !/^https:\/\//i.test(icsUrl)) {
    return NextResponse.redirect(absoluteUrl("/calendar?import=invalid_url"));
  }

  try {
    const response = await fetch(icsUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.redirect(absoluteUrl("/calendar?import=fetch_failed"));
    }

    const events = parseIcsCalendar(await response.text()).slice(0, 100);
    for (const event of events) {
      await prisma.meeting.upsert({
        where: {
          provider_externalId_ownerId: {
            provider: CalendarProvider.GOOGLE,
            externalId: `ics:${event.uid}`,
            ownerId: user.id
          }
        },
        create: {
          ownerId: user.id,
          workspaceId: workspace.id,
          provider: CalendarProvider.GOOGLE,
          externalId: `ics:${event.uid}`,
          title: event.title,
          description: event.description,
          location: event.location,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          status: meetingStatus(event.startsAt, event.endsAt),
          attendees: {
            create: event.attendees.map((attendee) => ({
              name: attendee.name,
              email: attendee.email
            }))
          }
        },
        update: {
          workspaceId: workspace.id,
          title: event.title,
          description: event.description,
          location: event.location,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          status: meetingStatus(event.startsAt, event.endsAt)
        }
      });
    }

    return NextResponse.redirect(absoluteUrl(`/dashboard?icsImported=${events.length}`));
  } catch {
    return NextResponse.redirect(absoluteUrl("/calendar?import=failed"));
  }
}
