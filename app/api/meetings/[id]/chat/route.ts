import { NextRequest, NextResponse } from "next/server";
import { ChatRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient, summaryModel } from "@/lib/openai";
import { semanticSearch } from "@/lib/ai/vector-store";
import { requireWorkspaceContext } from "@/lib/session";
import { assertWithinUsageLimit, trackUsage } from "@/lib/usage";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, workspace } = await requireWorkspaceContext();
  await assertWithinUsageLimit(workspace.id, "AI_CHAT");

  const { id } = await params;
  const body = (await request.json()) as { message?: string; sessionId?: string };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const meeting = await prisma.meeting.findFirst({
    where: { id, OR: [{ ownerId: user.id }, { workspaceId: workspace.id }] },
    include: { summary: true }
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chatSession = body.sessionId
    ? await prisma.meetingChatSession.findFirstOrThrow({
        where: { id: body.sessionId, meetingId: meeting.id, userId: user.id }
      })
    : await prisma.meetingChatSession.create({
        data: { meetingId: meeting.id, userId: user.id, title: message.slice(0, 80) }
      });

  await prisma.meetingChatMessage.create({
    data: { sessionId: chatSession.id, role: ChatRole.USER, content: message }
  });

  const citations = await semanticSearch(user.id, message, meeting.id, 6);
  const recentMessages = await prisma.meetingChatMessage.findMany({
    where: { sessionId: chatSession.id },
    orderBy: { createdAt: "desc" },
    take: 8
  });
  const conversation = recentMessages
    .reverse()
    .map((item) => `${item.role === ChatRole.USER ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");
  const context = citations
    .map((citation, index) => `[${index + 1}] ${citation.title} (${citation.source}, score ${citation.score.toFixed(3)}): ${citation.content}`)
    .join("\n\n");

  let answer: string;
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: summaryModel,
      messages: [
        {
          role: "system",
          content:
            "You are MeetMind AI chat. Answer using meeting, transcript, summary, and organization knowledge context. Cite source numbers when useful. If the context is insufficient, say so clearly."
        },
        {
          role: "user",
          content: `Meeting: ${meeting.title}\nExecutive summary: ${meeting.summary?.executive ?? meeting.summary?.overview ?? "None"}\nRecent conversation:\n${conversation || "None"}\n\nRetrieved RAG context:\n${context || "No indexed context found."}\n\nQuestion: ${message}`
        }
      ]
    });
    answer = response.choices[0]?.message.content ?? "I could not generate an answer.";
  } catch {
    const topCitation = citations[0];
    answer = [
      `Generated answer for "${message}"`,
      meeting.summary?.executive ?? meeting.summary?.overview ?? `This question is about ${meeting.title}.`,
      topCitation ? `Most relevant local context: ${topCitation.title} - ${topCitation.content.slice(0, 260)}` : "No indexed local context was found yet. Try indexing the meeting or adding knowledge."
    ].join("\n\n");
  }
  const assistantMessage = await prisma.meetingChatMessage.create({
    data: {
      sessionId: chatSession.id,
      role: ChatRole.ASSISTANT,
      content: answer,
      citations: citations as Prisma.InputJsonValue
    }
  });
  await trackUsage({ workspaceId: meeting.workspaceId ?? workspace.id, userId: user.id, type: "AI_CHAT" });

  return NextResponse.json({ sessionId: chatSession.id, message: assistantMessage, citations });
}
