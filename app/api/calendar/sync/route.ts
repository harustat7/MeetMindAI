import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCalendarAccount } from "@/lib/calendar/sync";
import { requireWorkspaceContext } from "@/lib/session";
import { assertWithinUsageLimit, trackUsage } from "@/lib/usage";
import { absoluteUrl } from "@/lib/utils";

export async function POST() {
  const { user, workspace } = await requireWorkspaceContext();
  await assertWithinUsageLimit(workspace.id, "MEETING_SYNC");

  const accounts = await prisma.calendarAccount.findMany({
    where: { userId: user.id },
    select: { id: true }
  });
  if (accounts.length === 0) {
    return NextResponse.redirect(absoluteUrl("/dashboard?synced=0&failed=0&calendar=no_accounts"));
  }

  const results = await Promise.allSettled(accounts.map((account) => syncCalendarAccount(account.id)));

  const failed = results.filter((result) => result.status === "rejected").length;
  await trackUsage({ workspaceId: workspace.id, userId: user.id, type: "MEETING_SYNC", quantity: Math.max(1, accounts.length - failed) });

  return NextResponse.redirect(absoluteUrl(`/dashboard?synced=${accounts.length - failed}&failed=${failed}`));
}
