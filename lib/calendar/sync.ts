import { CalendarProvider, MeetingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchGoogleEvents } from "@/lib/calendar/google";
import { fetchMicrosoftEvents } from "@/lib/calendar/microsoft";

function statusForDate(start: Date, cancelled = false) {
  if (cancelled) return MeetingStatus.CANCELLED;
  return start.getTime() > Date.now() ? MeetingStatus.UPCOMING : MeetingStatus.COMPLETED;
}

export async function syncCalendarAccount(calendarAccountId: string) {
  const account = await prisma.calendarAccount.findUniqueOrThrow({
    where: { id: calendarAccountId }
  });
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: account.userId },
    select: { workspaceId: true },
    orderBy: { createdAt: "asc" }
  });

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 90);

  if (account.provider === CalendarProvider.GOOGLE) {
    const events = await fetchGoogleEvents(account.accessToken, timeMin, timeMax);

    for (const event of events.items) {
      const startsAt = new Date(event.start.dateTime ?? event.start.date ?? new Date());
      const endsAt = new Date(event.end.dateTime ?? event.end.date ?? startsAt);
      await upsertMeeting({
        ownerId: account.userId,
        workspaceId: membership?.workspaceId,
        calendarAccountId: account.id,
        provider: CalendarProvider.GOOGLE,
        externalId: event.id,
        title: event.summary ?? "Untitled meeting",
        description: event.description,
        location: event.location,
        conferenceUrl: event.hangoutLink,
        startsAt,
        endsAt,
        status: statusForDate(startsAt, event.status === "cancelled"),
        attendees:
          event.attendees?.map((attendee) => ({
            name: attendee.displayName,
            email: attendee.email,
            response: attendee.responseStatus
          })) ?? []
      });
    }
  }

  if (account.provider === CalendarProvider.MICROSOFT) {
    const events = await fetchMicrosoftEvents(account.accessToken, timeMin, timeMax);

    for (const event of events.value) {
      const startsAt = new Date(event.start.dateTime);
      const endsAt = new Date(event.end.dateTime);
      await upsertMeeting({
        ownerId: account.userId,
        workspaceId: membership?.workspaceId,
        calendarAccountId: account.id,
        provider: CalendarProvider.MICROSOFT,
        externalId: event.id,
        title: event.subject ?? "Untitled meeting",
        description: event.bodyPreview,
        location: event.location?.displayName,
        conferenceUrl: event.onlineMeeting?.joinUrl,
        startsAt,
        endsAt,
        status: statusForDate(startsAt, event.isCancelled),
        attendees:
          event.attendees?.map((attendee) => ({
            name: attendee.emailAddress?.name,
            email: attendee.emailAddress?.address,
            response: attendee.status?.response
          })) ?? []
      });
    }
  }

  await prisma.calendarAccount.update({
    where: { id: calendarAccountId },
    data: { lastSyncedAt: new Date() }
  });
}

type UpsertMeetingInput = {
  ownerId: string;
  workspaceId?: string;
  calendarAccountId: string;
  provider: CalendarProvider;
  externalId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  conferenceUrl?: string | null;
  startsAt: Date;
  endsAt: Date;
  status: MeetingStatus;
  attendees: Array<{ name?: string; email?: string; response?: string }>;
};

async function upsertMeeting(input: UpsertMeetingInput) {
  const { attendees, ...meeting } = input;

  const saved = await prisma.meeting.upsert({
    where: {
      provider_externalId_ownerId: {
        provider: meeting.provider,
        externalId: meeting.externalId ?? "",
        ownerId: meeting.ownerId
      }
    },
    create: meeting,
    update: meeting
  });

  await prisma.meetingAttendee.deleteMany({ where: { meetingId: saved.id } });

  if (attendees.length > 0) {
    await prisma.meetingAttendee.createMany({
      data: attendees.map((attendee) => ({
        meetingId: saved.id,
        name: attendee.name,
        email: attendee.email,
        response: attendee.response
      }))
    });
  }
}
