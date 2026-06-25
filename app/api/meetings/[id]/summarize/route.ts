import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { summaryModel } from "@/lib/openai";
import { expandMeetingWithAI } from "@/lib/ai/meeting-engine";
import { indexMeetingForSearch, semanticSearch } from "@/lib/ai/vector-store";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { assertWithinUsageLimit, trackUsage } from "@/lib/usage";
import { absoluteUrl } from "@/lib/utils";

function buildActionDescription(item: {
  description?: string;
  owner?: string;
  due?: string;
  priority?: string;
}) {
  return [
    item.description,
    item.owner ? `Owner: ${item.owner}` : "",
    item.due ? `Due: ${item.due}` : "",
    item.priority ? `Priority: ${item.priority}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLocalExpansion(meeting: { title: string; description: string | null; transcript: { content: string } | null }) {
  const transcript = meeting.transcript?.content ?? "";
  return {
    executiveSummary: `${meeting.title} focused on setup clarity, meeting readiness, and the next actions needed to make the workspace useful.`,
    detailedSummary: [
      meeting.description,
      "Summary generated locally because AI generation is unavailable.",
      transcript ? `Transcript signal: ${transcript.slice(0, 500)}` : ""
    ]
      .filter(Boolean)
      .join("\n\n"),
    decisions: [
      "Use available workspace data for the meeting workflow.",
      "Keep external integrations optional until they are needed."
    ],
    risks: [
      "External credential setup can block testing the core product experience.",
      "Blank states can make onboarding harder unless the next action is clear."
    ],
    blockers: [
      "Real calendar sync still requires provider OAuth credentials."
    ],
    nextSteps: [
      "Review the meeting details.",
      "Test knowledge search and chat with local fallback data.",
      "Add real provider credentials only when integration testing starts."
    ],
    actionItems: [
      {
        title: "Verify the workspace dashboard",
        description: "Refresh the dashboard and confirm seeded meetings, knowledge, and actions are visible.",
        owner: "Dev User",
        priority: "High"
      },
      {
        title: "Test optional integrations later",
        description: "Leave third-party credentials blank until real OAuth flows are required.",
        owner: "Dev User",
        priority: "Medium"
      }
    ],
    expansion: {
      executionPlan: [
        { phase: "Review", owner: "Workspace owner", steps: ["Open dashboard", "Open meeting", "Run search and chat"] }
      ],
      projectRoadmap: [
        { horizon: "Workspace", outcomes: ["Core meeting workflow works without provider credentials"] },
        { horizon: "Integration", outcomes: ["Calendar providers can be configured when needed"] }
      ],
      timeline: [
        { period: "Now", work: ["Validate seeded content", "Use local AI fallbacks"] }
      ],
      milestones: [
        { name: "Meeting workflow ready", acceptanceCriteria: ["Dashboard loads", "Meeting actions complete", "Search returns data"] }
      ],
      resourceRequirements: [
        { resource: "OpenAI API key", reason: "Needed for hosted AI summaries, chat, and follow-ups", priority: "Recommended" }
      ],
      successMetrics: [
        { metric: "Broken meeting actions", target: "0", measurement: "Manual click-through" }
      ]
    }
  };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, workspace } = await requireWorkspaceContext();
  await assertWithinUsageLimit(workspace.id, "AI_SUMMARY");

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, OR: [{ ownerId: user.id }, { workspaceId: workspace.id }] },
    include: { transcript: true }
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!meeting.transcript?.content) {
    return NextResponse.redirect(absoluteUrl(`/meetings/${meeting.id}?summary=missing_transcript`));
  }

  const contextQuery = [meeting.title, meeting.description, meeting.transcript.content.slice(0, 1600)].filter(Boolean).join("\n");
  const retrievedContext = await semanticSearch(user.id, contextQuery, undefined, 6);
  const organizationContext = retrievedContext
    .filter((citation) => citation.source === "knowledge" || citation.id !== meeting.id)
    .map((citation, index) => `[${index + 1}] ${citation.title} (${citation.source}, score ${citation.score.toFixed(3)}): ${citation.content}`)
    .join("\n\n");

  let parsed;
  try {
    parsed = await expandMeetingWithAI({
      title: meeting.title,
      description: meeting.description,
      transcript: meeting.transcript.content,
      organizationContext
    });
  } catch {
    parsed = buildLocalExpansion(meeting);
  }

  await prisma.$transaction(async (tx) => {
    await tx.summary.upsert({
      where: { meetingId: meeting.id },
      create: {
        meetingId: meeting.id,
        model: summaryModel,
        executive: parsed.executiveSummary,
        overview: parsed.executiveSummary,
        detailed: parsed.detailedSummary,
        decisions: parsed.decisions,
        risks: parsed.risks,
        blockers: parsed.blockers,
        nextSteps: parsed.nextSteps
      },
      update: {
        model: summaryModel,
        executive: parsed.executiveSummary,
        overview: parsed.executiveSummary,
        detailed: parsed.detailedSummary,
        decisions: parsed.decisions,
        risks: parsed.risks,
        blockers: parsed.blockers,
        nextSteps: parsed.nextSteps
      }
    });

    await tx.meetingExpansion.upsert({
      where: { meetingId: meeting.id },
      create: {
        meetingId: meeting.id,
        model: summaryModel,
        executionPlan: parsed.expansion.executionPlan,
        projectRoadmap: parsed.expansion.projectRoadmap,
        timeline: parsed.expansion.timeline,
        milestones: parsed.expansion.milestones,
        resourceRequirements: parsed.expansion.resourceRequirements,
        successMetrics: parsed.expansion.successMetrics
      },
      update: {
        model: summaryModel,
        executionPlan: parsed.expansion.executionPlan,
        projectRoadmap: parsed.expansion.projectRoadmap,
        timeline: parsed.expansion.timeline,
        milestones: parsed.expansion.milestones,
        resourceRequirements: parsed.expansion.resourceRequirements,
        successMetrics: parsed.expansion.successMetrics
      }
    });

    await tx.actionItem.deleteMany({ where: { meetingId: meeting.id } });
    if (parsed.actionItems.length > 0) {
      await tx.actionItem.createMany({
        data: parsed.actionItems.map((item) => ({
          meetingId: meeting.id,
          title: item.title,
          description: buildActionDescription(item) || null
        }))
      });
    }
  });

  await indexMeetingForSearch(meeting.id);
  await trackUsage({ workspaceId: meeting.workspaceId ?? workspace.id, userId: user.id, type: "AI_SUMMARY" });
  await trackUsage({ workspaceId: meeting.workspaceId ?? workspace.id, userId: user.id, type: "VECTOR_INDEX" });
  await writeAuditLog({
    workspaceId: meeting.workspaceId ?? workspace.id,
    actorId: user.id,
    action: AuditAction.MEETING_SUMMARIZED,
    targetType: "Meeting",
    targetId: meeting.id
  });

  return NextResponse.redirect(absoluteUrl(`/meetings/${meeting.id}?summary=generated`));
}
