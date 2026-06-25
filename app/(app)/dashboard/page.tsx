import { CalendarCheck, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Database } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingList } from "@/components/meeting-list";
import { SemanticSearch } from "@/components/semantic-search";
import { getVectorStoreStats } from "@/lib/ai/vector-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const [meetings, upcomingCount, completedCount, actionCount, calendarAccounts, knowledgeCount, vectorStats] = await Promise.all([
    prisma.meeting.findMany({
      where: { ownerId: user.id },
      orderBy: { startsAt: "asc" },
      include: {
        summary: { select: { id: true } },
        attendees: { select: { id: true } }
      },
      take: 12
    }),
    prisma.meeting.count({ where: { ownerId: user.id, startsAt: { gte: now } } }),
    prisma.meeting.count({ where: { ownerId: user.id, startsAt: { lt: now } } }),
    prisma.actionItem.count({ where: { meeting: { ownerId: user.id }, status: { not: "DONE" } } }),
    prisma.calendarAccount.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.knowledgeDocument.count({ where: { ownerId: user.id } }),
    getVectorStoreStats(user.id)
  ]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-6">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your meetings, summaries, search, and follow-ups in one workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/calendar">Set up calendar</a>
          </Button>
          <Button asChild>
            <a href="/meetings/new">
              <CalendarPlus className="h-4 w-4" />
              New meeting
            </a>
          </Button>
          <form action="/api/calendar/sync" method="post">
            <Button type="submit" variant="outline">Sync</Button>
          </form>
        </div>
      </header>

      {calendarAccounts.length === 0 ? <SetupPanel googleConfigured={googleConfigured} /> : null}

      <section className="grid gap-3 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Upcoming" value={upcomingCount} icon={<Clock3 className="h-4 w-4" />} />
        <Metric title="Completed" value={completedCount} icon={<CalendarCheck className="h-4 w-4" />} />
        <Metric title="Open actions" value={actionCount} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Metric title="Vector chunks" value={vectorStats.totalChunks} icon={<Database className="h-4 w-4" />} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Meetings</h2>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="/calendar">Import</a>
              </Button>
              <Button asChild size="sm">
                <a href="/meetings/new">New</a>
              </Button>
            </div>
          </div>
          <MeetingList meetings={meetings} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semantic search</CardTitle>
            </CardHeader>
            <CardContent>
              <SemanticSearch />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <IndexMetric label="Indexed meetings" value={vectorStats.indexedMeetings} />
                <IndexMetric label="Knowledge docs" value={knowledgeCount} />
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Calendar</p>
                {calendarAccounts.length === 0 ? (
                  <p className="mt-1 text-sm font-medium">Not connected</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {calendarAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium">{account.email ?? account.provider.toLowerCase()}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{account.lastSyncedAt ? "Synced" : "Pending"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function SetupPanel({ googleConfigured }: { googleConfigured: boolean }) {
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Connect your calendar</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {googleConfigured ? "Use Google OAuth or import a Google iCal URL to bring meetings into this workspace." : "Import a Google iCal URL to bring meetings into this workspace without OAuth setup."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild variant="outline">
          <a href="/meetings/new">Create manually</a>
        </Button>
        <Button asChild>
          <a href="/calendar">Open setup</a>
        </Button>
      </div>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function IndexMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
