import { NextRequest, NextResponse } from "next/server";
import { AuditAction, KnowledgeSourceType } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { indexKnowledgeDocument } from "@/lib/ai/vector-store";
import { requireWorkspaceContext } from "@/lib/session";
import { assertWithinUsageLimit, trackUsage } from "@/lib/usage";
import { absoluteUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const { user, workspace } = await requireWorkspaceContext();
  await assertWithinUsageLimit(workspace.id, "KNOWLEDGE_DOCUMENT");

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const sourceType = String(formData.get("sourceType") ?? "DOCUMENT") as KnowledgeSourceType;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const document = await prisma.knowledgeDocument.create({
    data: { ownerId: user.id, workspaceId: workspace.id, title, content, sourceType }
  });

  await indexKnowledgeDocument(document.id);
  await trackUsage({ workspaceId: workspace.id, userId: user.id, type: "KNOWLEDGE_DOCUMENT" });
  await trackUsage({ workspaceId: workspace.id, userId: user.id, type: "VECTOR_INDEX" });
  await writeAuditLog({
    workspaceId: workspace.id,
    actorId: user.id,
    action: AuditAction.KNOWLEDGE_CREATED,
    targetType: "KnowledgeDocument",
    targetId: document.id
  });

  return NextResponse.redirect(absoluteUrl("/knowledge"));
}
