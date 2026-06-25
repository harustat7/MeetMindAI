import { getOpenAIClient } from "@/lib/openai";

export const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

function fallbackEmbedding(text: string) {
  const vector = Array.from({ length: 64 }, () => 0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  for (const word of words) {
    let hash = 0;
    for (let index = 0; index < word.length; index += 1) {
      hash = (hash * 31 + word.charCodeAt(index)) >>> 0;
    }
    vector[hash % vector.length] += 1;
  }

  return vector;
}

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) return [];
  if (!process.env.OPENAI_API_KEY) {
    return texts.map(fallbackEmbedding);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: texts
    });

    return response.data.map((item) => item.embedding);
  } catch {
    return texts.map(fallbackEmbedding);
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
