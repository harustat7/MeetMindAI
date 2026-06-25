import { NextRequest, NextResponse } from "next/server";
import { MeetingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { combineDateTime, parseAttendees } from "@/lib/meetings/manual";
import { requireWorkspaceContext } from "@/lib/session";
import { absoluteUrl } from "@/lib/utils";

function statusFor(startsAt: Date) {
  return startsAt.getTime() > Date.now() ? MeetingStatus.UPCOMING : MeetingStatus.COMPLETED;
}

export async function POST(request: NextRequest) {
  const { user, workspace } = await requireWorkspaceContext();
  const formData = await request.formData();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const starts = String(formData.get("startsAt") ?? "");
  const ends = String(formData.get("endsAt") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const attendees = parseAttendees(String(formData.get("attendees") ?? ""));
  const transcript = String(formData.get("transcript") ?? "").trim();

  const startsAt = combineDateTime(date, starts);
  const endsAt = combineDateTime(date, ends);

  if (!title || !startsAt || !endsAt || endsAt <= startsAt) {
    return NextResponse.redirect(absoluteUrl("/meetings/new?error=invalid"));
  }

  const meeting = await prisma.meeting.create({
    data: {
      ownerId: user.id,
      workspaceId: workspace.id,
      title,
      description: description || null,
      location: location || null,
      startsAt,
      endsAt,
      status: statusFor(startsAt),
      attendees: attendees.length
        ? {
            create: attendees.map((attendee) => ({
              name: attendee.name,
              email: attendee.email
            }))
          }
        : undefined,
      transcript: transcript
        ? {
            create: {
              content: transcript,
              source: "manual"
            }
          }
        : undefined
    },
    select: { id: true }
  });

  return NextResponse.redirect(absoluteUrl(`/meetings/${meeting.id}`), { status: 303 });
}
