import { z } from "zod";
import { getOpenAIClient, summaryModel } from "@/lib/openai";
import { parseJsonObject } from "@/lib/ai/json";

const followUpSchema = z.object({
  subject: z.string(),
  body: z.string(),
  recipients: z.array(z.string()).default([])
});

export async function generateFollowUpEmail(input: {
  title: string;
  attendees: Array<{ email?: string | null; name?: string | null }>;
  summary?: string | null;
  detailedSummary?: string | null;
  decisions?: string[];
  risks?: string[];
  blockers?: string[];
  actionItems: Array<{ title: string; description?: string | null }>;
}) {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: summaryModel,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Draft a professional follow-up email after a business meeting. Return strict JSON with subject, body, and recipients. Include decisions, action items, owners if known, and next steps."
      },
      {
        role: "user",
        content: JSON.stringify(input)
      }
    ]
  });

  return followUpSchema.parse(parseJsonObject(response.choices[0]?.message.content));
}
