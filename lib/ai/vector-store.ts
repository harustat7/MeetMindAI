import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/ai/chunking";
import { cosineSimilarity, embedTexts } from "@/lib/ai/embeddings";

export type RagCitation = {
  source: "meeting" | "knowledge";
  id: string;
  chunkId: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

function asVector(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

export async function indexMeetingForSearch(meetingId: string) {
  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { transcript: true, summary: true }
  });

  const source = [
    `Title: ${meeting.title}`,
    meeting.description ? `Description: ${meeting.description}` : "",
    meeting.summary?.executive ? `Executive summary: ${meeting.summary.executive}` : "",
    meeting.summary?.overview ? `Summary: ${meeting.summary.overview}` : "",
    meeting.summary?.detailed ? `Detailed summary: ${meeting.summary.detailed}` : "",
    meeting.summary?.decisions.length ? `Decisions: ${meeting.summary.decisions.join("; ")}` : "",
    meeting.summary?.risks.length ? `Risks: ${meeting.summary.risks.join("; ")}` : "",
    meeting.summary?.blockers.length ? `Blockers: ${meeting.summary.blockers.join("; ")}` : "",
    meeting.summary?.nextSteps.length ? `Next steps: ${meeting.summary.nextSteps.join("; ")}` : "",
    meeting.transcript?.content ? `Transcript: ${meeting.transcript.content}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const chunks = chunkText(source);
  const embeddings = await embedTexts(chunks);

  await prisma.$transaction(async (tx) => {
    await tx.meetingEmbedding.deleteMany({ where: { meetingId } });
    if (chunks.length > 0) {
      await tx.meetingEmbedding.createMany({
        data: chunks.map((chunk, index) => ({
          meetingId,
          chunkIndex: index,
          content: chunk,
          embedding: embeddings[index],
          metadata: { title: meeting.title }
        }))
      });
    }
  });
}

export async function indexKnowledgeDocument(documentId: string) {
  const document = await prisma.knowledgeDocument.findUniqueOrThrow({
    where: { id: documentId }
  });

  const chunks = chunkText(`${document.title}\n\n${document.content}`);
  const embeddings = await embedTexts(chunks);

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeEmbedding.deleteMany({ where: { documentId } });
    if (chunks.length > 0) {
      await tx.knowledgeEmbedding.createMany({
        data: chunks.map((chunk, index) => ({
          documentId,
          chunkIndex: index,
          content: chunk,
          embedding: embeddings[index],
          metadata: { title: document.title, sourceType: document.sourceType }
        }))
      });
    }
  });
}

export async function semanticSearch(userId: string, query: string, meetingId?: string, limit = 8) {
  const [queryEmbedding] = await embedTexts([query]);
  if (!queryEmbedding) return [];

  const [meetingChunks, knowledgeChunks] = await Promise.all([
    prisma.meetingEmbedding.findMany({
      where: meetingId ? { meetingId, meeting: { ownerId: userId } } : { meeting: { ownerId: userId } },
      include: { meeting: { select: { title: true } } }
    }),
    prisma.knowledgeEmbedding.findMany({
      where: { document: { ownerId: userId } },
      include: { document: { select: { title: true } } }
    })
  ]);

  const meetingResults: RagCitation[] = meetingChunks.map((chunk) => ({
    source: "meeting",
    id: chunk.meetingId,
    chunkId: chunk.id,
    title: chunk.meeting.title,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, asVector(chunk.embedding)),
    metadata: typeof chunk.metadata === "object" && chunk.metadata !== null ? chunk.metadata as Record<string, unknown> : undefined
  }));

  const knowledgeResults: RagCitation[] = knowledgeChunks.map((chunk) => ({
    source: "knowledge",
    id: chunk.documentId,
    chunkId: chunk.id,
    title: chunk.document.title,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, asVector(chunk.embedding)),
    metadata: typeof chunk.metadata === "object" && chunk.metadata !== null ? chunk.metadata as Record<string, unknown> : undefined
  }));

  return [...meetingResults, ...knowledgeResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getVectorStoreStats(userId: string) {
  const [meetingChunks, knowledgeChunks, indexedMeetings, knowledgeDocuments] = await Promise.all([
    prisma.meetingEmbedding.count({ where: { meeting: { ownerId: userId } } }),
    prisma.knowledgeEmbedding.count({ where: { document: { ownerId: userId } } }),
    prisma.meeting.count({ where: { ownerId: userId, embeddings: { some: {} } } }),
    prisma.knowledgeDocument.count({ where: { ownerId: userId } })
  ]);

  return {
    meetingChunks,
    knowledgeChunks,
    indexedMeetings,
    knowledgeDocuments,
    totalChunks: meetingChunks + knowledgeChunks
  };
}
