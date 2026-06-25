import { Prisma, UsageEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { plans } from "@/lib/plans";

function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMonthlyUsage(workspaceId: string) {
  const events = await prisma.usageEvent.groupBy({
    by: ["type"],
    where: {
      workspaceId,
      createdAt: { gte: currentMonthStart() }
    },
    _sum: { quantity: true }
  });

  return Object.fromEntries(events.map((event) => [event.type, event._sum.quantity ?? 0])) as Partial<Record<UsageEventType, number>>;
}

export async function trackUsage(input: {
  workspaceId?: string | null;
  userId?: string | null;
  type: UsageEventType;
  quantity?: number;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.usageEvent.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      quantity: input.quantity ?? 1,
      metadata: input.metadata
    }
  });
}

export async function assertWithinUsageLimit(workspaceId: string, type: UsageEventType) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const limit = plans[workspace.plan].limits[type];
  if (limit === "unlimited") return;

  const usage = await getMonthlyUsage(workspaceId);
  if ((usage[type] ?? 0) >= limit) {
    throw new Error(`${type} limit reached for the ${plans[workspace.plan].name} plan`);
  }
}
