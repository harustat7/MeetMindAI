import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Bot, Calendar, CheckCircle2, Database, Mail, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AIExpansion } from "@/components/ai-expansion";
import { MeetingChat } from "@/components/meeting-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function MeetingDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const meeting = await prisma.meeting.findFirst({
    where: { id, ownerId: user.id },
    include: {
      attendees: true,
      transcript: true,
      summary: true,
      expansion: true,
      embeddings: { select: { id: true } },
      followUpEmails: { orderBy: { createdAt: "desc" }, take: 3 },
      actionItems: { include: { assignee: true }, orderBy: { createdAt: "asc" } }
    }
  });

  if (!meeting) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{meeting.status.toLowerCase()}</Badge>
            {meeting.provider ? <Badge variant="outline">{meeting.provider.toLowerCase()}</Badge> : null}
            <Badge variant={meeting.embeddings.length > 0 ? "default" : "muted"}>
              <Database className="mr-1 h-3 w-3" />
              {meeting.embeddings.length} vectors
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">{meeting.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(meeting.startsAt, "MMM d, yyyy h:mm a")} - {format(meeting.endsAt, "h:mm a")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={`/api/meetings/${meeting.id}/summarize`} method="post">
            <Button type="submit">
              <Bot className="h-4 w-4" />
              Expand meeting
            </Button>
          </form>
          <form action={`/api/meetings/${meeting.id}/index`} method="post">
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
              Index
            </Button>
          </form>
          <form action={`/api/meetings/${meeting.id}/follow-up`} method="post">
            <Button type="submit" variant="outline">
              <Mail className="h-4 w-4" />
              Follow-up
            </Button>
          </form>
        </div>
      </header>

      <StatusNotice query={query} />

      <section className="grid gap-6 py-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI summary</CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.summary ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Executive summary</h3>
                    <p className="text-sm leading-6">{meeting.summary.executive ?? meeting.summary.overview}</p>
                  </div>
                  {meeting.summary.detailed ? (
                    <div>
                      <Separator className="mb-4" />
                      <h3 className="mb-2 text-sm font-semibold">Detailed summary</h3>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{meeting.summary.detailed}</p>
                    </div>
                  ) : null}
                  <SummaryGroup title="Decisions" items={meeting.summary.decisions} />
                  <SummaryGroup title="Risks" items={meeting.summary.risks} />
                  <SummaryGroup title="Blockers" items={meeting.summary.blockers} />
                  <SummaryGroup title="Next steps" items={meeting.summary.nextSteps} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Add a transcript, then generate an AI summary for this meeting.</p>
              )}
            </CardContent>
          </Card>

          <AIExpansion expansion={meeting.expansion} />

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={`/api/meetings/${meeting.id}/transcript`} method="post" className="space-y-3">
                <textarea
                  name="content"
                  defaultValue={meeting.transcript?.content}
                  className="min-h-[260px] w-full rounded-md border bg-background p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Paste transcript text here..."
                />
                <Button type="submit" variant="outline">Save transcript</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MeetingChat meetingId={meeting.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Follow-up emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meeting.followUpEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Generate a follow-up email after summarizing this meeting.</p>
              ) : (
                meeting.followUpEmails.map((email) => (
                  <div key={email.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{email.subject}</p>
                    {email.recipients.length ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">To: {email.recipients.join(", ")}</p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{email.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Attendees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meeting.attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees found.</p>
              ) : (
                meeting.attendees.map((attendee) => (
                  <div key={attendee.id}>
                    <p className="text-sm font-medium">{attendee.name ?? attendee.email ?? "Unknown attendee"}</p>
                    <p className="text-xs text-muted-foreground">{attendee.email}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Action items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meeting.actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No action items yet.</p>
              ) : (
                meeting.actionItems.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant="muted">{item.status.toLowerCase()}</Badge>
                    </div>
                    {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function StatusNotice({ query }: { query: Record<string, string | string[] | undefined> }) {
  const message =
    query.summary === "generated"
      ? "Meeting summary, expansion engine output, action items, and vectors were generated."
      : query.summary === "missing_transcript"
        ? "Add a transcript before generating AI summaries and expansion artifacts."
        : query.indexed === "true"
          ? "Meeting vectors were refreshed for semantic search and RAG chat."
          : query.followUp === "generated"
            ? "Follow-up email generated."
            : "";

  if (!message) return null;

  return (
    <div className="mt-4 rounded-md border bg-accent px-4 py-3 text-sm text-accent-foreground">
      {message}
    </div>
  );
}

function SummaryGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <Separator className="mb-4" />
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="leading-6">- {item}</li>
        ))}
      </ul>
    </div>
  );
}
