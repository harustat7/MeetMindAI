import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await request.formData();
  const content = String(formData.get("content") ?? "").trim();

  const meeting = await prisma.meeting.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true }
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transcript.upsert({
    where: { meetingId: meeting.id },
    create: { meetingId: meeting.id, content, source: "manual" },
    update: { content, source: "manual" }
  });

  return NextResponse.redirect(absoluteUrl(`/meetings/${meeting.id}`));
}
