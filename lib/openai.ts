import OpenAI from "openai";

export const summaryModel = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4.1-mini";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate meeting summaries");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 10000
  });
}
