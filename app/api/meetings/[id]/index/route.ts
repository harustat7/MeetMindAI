import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { indexMeetingForSearch } from "@/lib/ai/vector-store";
import { requireWorkspaceContext } from "@/lib/session";
import { assertWithinUsageLimit, trackUsage } from "@/lib/usage";
import { absoluteUrl } from "@/lib/utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, workspace } = await requireWorkspaceContext();
  await assertWithinUsageLimit(workspace.id, "VECTOR_INDEX");

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, OR: [{ ownerId: user.id }, { workspaceId: workspace.id }] },
    select: { id: true, workspaceId: true }
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await indexMeetingForSearch(meeting.id);
  await trackUsage({ workspaceId: meeting.workspaceId ?? workspace.id, userId: user.id, type: "VECTOR_INDEX" });
  await writeAuditLog({
    workspaceId: meeting.workspaceId ?? workspace.id,
    actorId: user.id,
    action: AuditAction.MEETING_INDEXED,
    targetType: "Meeting",
    targetId: meeting.id
  });

  return NextResponse.redirect(absoluteUrl(`/meetings/${meeting.id}?indexed=true`));
}
