import { NextRequest, NextResponse } from "next/server";
import { AuditAction, WorkspaceRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { canManageWorkspace } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { user, workspace, role } = await requireWorkspaceContext();
  if (!canManageWorkspace(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const memberRole = String(formData.get("role") ?? "MEMBER") as WorkspaceRole;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const invitedUser = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {}
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: invitedUser.id } },
    create: { workspaceId: workspace.id, userId: invitedUser.id, role: memberRole },
    update: { role: memberRole }
  });

  await writeAuditLog({
    workspaceId: workspace.id,
    actorId: user.id,
    action: AuditAction.MEMBER_INVITED,
    targetType: "User",
    targetId: invitedUser.id,
    metadata: { email, role: memberRole }
  });

  return NextResponse.redirect(new URL("/team", request.url), { status: 303 });
}
