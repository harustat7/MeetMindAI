import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { canEditWorkspace } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, workspace, role } = await requireWorkspaceContext();
  if (!canEditWorkspace(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return NextResponse.json({ error: "Comment is required" }, { status: 400 });

  const meeting = await prisma.meeting.findFirst({
    where: { id, OR: [{ workspaceId: workspace.id }, { ownerId: user.id }] },
    select: { id: true, workspaceId: true }
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: {
      meetingId: meeting.id,
      workspaceId: meeting.workspaceId ?? workspace.id,
      authorId: user.id,
      body
    }
  });

  await writeAuditLog({
    workspaceId: meeting.workspaceId ?? workspace.id,
    actorId: user.id,
    action: AuditAction.COMMENT_CREATED,
    targetType: "Comment",
    targetId: comment.id
  });

  return NextResponse.redirect(new URL(`/meetings/${meeting.id}`, request.url), { status: 303 });
}
