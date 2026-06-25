import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summaryModel } from "@/lib/openai";
import { generateFollowUpEmail } from "@/lib/ai/follow-up";
import { requireWorkspaceContext } from "@/lib/session";
import { assertWithinUsageLimit, trackUsage } from "@/lib/usage";
import { absoluteUrl } from "@/lib/utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, workspace } = await requireWorkspaceContext();
  await assertWithinUsageLimit(workspace.id, "FOLLOW_UP_EMAIL");

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, OR: [{ ownerId: user.id }, { workspaceId: workspace.id }] },
    include: { attendees: true, summary: true, actionItems: true }
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let generated;
  try {
    generated = await generateFollowUpEmail({
      title: meeting.title,
      attendees: meeting.attendees,
      summary: meeting.summary?.executive ?? meeting.summary?.overview,
      detailedSummary: meeting.summary?.detailed,
      decisions: meeting.summary?.decisions ?? [],
      risks: meeting.summary?.risks ?? [],
      blockers: meeting.summary?.blockers ?? [],
      actionItems: meeting.actionItems
    });
  } catch {
    generated = {
      subject: `Follow-up: ${meeting.title}`,
      body: [
        `Thanks for the discussion on ${meeting.title}.`,
        meeting.summary?.executive ?? meeting.summary?.overview ?? "This follow-up was generated locally because AI generation is unavailable.",
        meeting.actionItems.length
          ? `Action items:\n${meeting.actionItems.map((item) => `- ${item.title}`).join("\n")}`
          : "Next step: continue the meeting workflow."
      ].join("\n\n"),
      recipients: meeting.attendees.map((attendee) => attendee.email).filter((email): email is string => Boolean(email))
    };
  }

  await prisma.followUpEmail.create({
    data: {
      meetingId: meeting.id,
      subject: generated.subject,
      body: generated.body,
      recipients: generated.recipients,
      model: summaryModel
    }
  });
  await trackUsage({ workspaceId: meeting.workspaceId ?? workspace.id, userId: user.id, type: "FOLLOW_UP_EMAIL" });

  return NextResponse.redirect(absoluteUrl(`/meetings/${meeting.id}?followUp=generated`));
}
