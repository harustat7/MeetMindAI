import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { getMonthlyUsage } from "@/lib/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const { workspace } = await requireWorkspaceContext();
  const usage = await getMonthlyUsage(workspace.id);
  const [meetings, knowledge, actions] = await Promise.all([
    prisma.meeting.count({ where: { workspaceId: workspace.id } }),
    prisma.knowledgeDocument.count({ where: { workspaceId: workspace.id } }),
    prisma.actionItem.count({ where: { meeting: { workspaceId: workspace.id } } })
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-normal">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace activity and monthly usage.</p>
      </header>
      <section className="grid gap-4 py-6 sm:grid-cols-3">
        <Metric title="Meetings" value={meetings} />
        <Metric title="Knowledge docs" value={knowledge} />
        <Metric title="Action items" value={actions} />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(usage).length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">No tracked usage yet. Try indexing, search, chat, or follow-up actions.</CardContent>
          </Card>
        ) : (
          Object.entries(usage).map(([type, value]) => <Metric key={type} title={type.replaceAll("_", " ").toLowerCase()} value={value ?? 0} />)
        )}
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm capitalize text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
