export function parseJsonObject<T>(content: string | null | undefined): T {
  if (!content) {
    throw new Error("AI response was empty");
  }

  const trimmed = content.trim();
  const json = trimmed.startsWith("```") ? trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim() : trimmed;
  return JSON.parse(json) as T;
}
