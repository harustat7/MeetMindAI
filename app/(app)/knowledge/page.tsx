import { BookOpen, Database, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function KnowledgePage() {
  const user = await requireUser();
  const documents = await prisma.knowledgeDocument.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { embeddings: { select: { id: true } } }
  });
  const vectorChunkCount = documents.reduce((total, document) => total + document.embeddings.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="border-b pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Knowledge Base</h1>
            <p className="mt-1 text-sm text-muted-foreground">Add organization context for RAG chat, semantic search, and better meeting expansions.</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add knowledge</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/knowledge" method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Launch process, support policy, product brief..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceType">Source type</Label>
                <select
                  id="sourceType"
                  name="sourceType"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="DOCUMENT"
                >
                  <option value="DOCUMENT">Document</option>
                  <option value="NOTE">Note</option>
                  <option value="POLICY">Policy</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  name="content"
                  className="min-h-[220px] w-full rounded-md border bg-background p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Save and index</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {documents.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <IndexStat label="Documents" value={documents.length} />
              <IndexStat label="Vector chunks" value={vectorChunkCount} />
              <div className="rounded-md border p-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="h-3 w-3" />
                  Store
                </p>
                <p className="mt-1 text-lg font-semibold">Postgres</p>
              </div>
            </div>
          ) : null}

          {documents.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                <FileText className="h-9 w-9 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">No knowledge indexed yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Add internal context to power RAG answers.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            documents.map((document) => (
              <Card key={document.id}>
                <CardContent className="p-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{document.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{document.sourceType.toLowerCase()} - {document.embeddings.length} vector chunks</p>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{document.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function IndexStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
