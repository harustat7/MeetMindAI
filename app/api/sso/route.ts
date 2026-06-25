import { NextRequest, NextResponse } from "next/server";
import { AuditAction, SsoProvider } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { canManageWorkspace } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { user, workspace, role } = await requireWorkspaceContext();
  if (!canManageWorkspace(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const provider = String(formData.get("provider") ?? "OIDC") as SsoProvider;
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase();
  const issuer = String(formData.get("issuer") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const metadataUrl = String(formData.get("metadataUrl") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!domain) return NextResponse.json({ error: "Domain is required" }, { status: 400 });

  const connection = await prisma.ssoConnection.upsert({
    where: { workspaceId_domain: { workspaceId: workspace.id, domain } },
    create: { workspaceId: workspace.id, provider, domain, issuer, clientId, metadataUrl, enabled },
    update: { provider, issuer, clientId, metadataUrl, enabled }
  });

  await writeAuditLog({
    workspaceId: workspace.id,
    actorId: user.id,
    action: AuditAction.SSO_UPDATED,
    targetType: "SsoConnection",
    targetId: connection.id,
    metadata: { provider, domain, enabled }
  });

  return NextResponse.redirect(new URL("/settings/sso", request.url), { status: 303 });
}
