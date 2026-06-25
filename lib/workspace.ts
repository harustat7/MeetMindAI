import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

export async function ensureDefaultWorkspace(user: { id: string; name?: string | null; email?: string | null }) {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (existing) return existing;

  const baseName = user.name ?? user.email?.split("@")[0] ?? "My Workspace";
  const baseSlug = slugify(baseName) || "workspace";
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;

  return prisma.workspaceMember.create({
    data: {
      role: WorkspaceRole.OWNER,
      user: { connect: { id: user.id } },
      workspace: {
        create: {
          name: `${baseName}'s Workspace`,
          slug,
          default: true
        }
      }
    },
    include: { workspace: true }
  });
}

export async function getActiveWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  return membership;
}

export async function requireWorkspace(user: { id: string; name?: string | null; email?: string | null }) {
  await ensureDefaultWorkspace(user);
  const membership = await getActiveWorkspace(user.id);
  if (!membership) {
    throw new Error("Workspace could not be resolved");
  }
  return membership;
}
