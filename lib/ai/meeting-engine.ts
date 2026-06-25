import { z } from "zod";
import { getOpenAIClient, summaryModel } from "@/lib/openai";
import { parseJsonObject } from "@/lib/ai/json";

export const advancedMeetingSchema = z.object({
  executiveSummary: z.string(),
  detailedSummary: z.string(),
  actionItems: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    owner: z.string().optional(),
    due: z.string().optional(),
    priority: z.string().optional()
  })).default([]),
  decisions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  expansion: z.object({
    executionPlan: z.array(z.object({ phase: z.string(), owner: z.string().optional(), steps: z.array(z.string()).default([]) })).default([]),
    projectRoadmap: z.array(z.object({ horizon: z.string(), outcomes: z.array(z.string()).default([]) })).default([]),
    timeline: z.array(z.object({ period: z.string(), work: z.array(z.string()).default([]) })).default([]),
    milestones: z.array(z.object({ name: z.string(), due: z.string().optional(), acceptanceCriteria: z.array(z.string()).default([]) })).default([]),
    resourceRequirements: z.array(z.object({ resource: z.string(), reason: z.string(), priority: z.string().optional() })).default([]),
    successMetrics: z.array(z.object({ metric: z.string(), target: z.string(), measurement: z.string().optional() })).default([])
  })
});

export type AdvancedMeetingOutput = z.infer<typeof advancedMeetingSchema>;

export async function expandMeetingWithAI(input: {
  title: string;
  description?: string | null;
  transcript: string;
  organizationContext?: string;
}) {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: summaryModel,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are MeetMind AI's Meeting Expansion Engine. Convert meeting discussions into executive-ready summaries, operational plans, roadmaps, timelines, milestones, resource requirements, success metrics, decisions, risks, blockers, and action items. Return strict JSON only."
      },
      {
        role: "user",
        content: `Meeting title: ${input.title}\nDescription: ${input.description ?? "None"}\nOrganization RAG context:\n${input.organizationContext || "No organization knowledge retrieved."}\n\nTranscript:\n${input.transcript}`
      }
    ]
  });

  return advancedMeetingSchema.parse(parseJsonObject<AdvancedMeetingOutput>(response.choices[0]?.message.content));
}
