import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";

export default async function AuditPage() {
  const { workspace } = await requireWorkspaceContext();
  const logs = await prisma.auditLog.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 25
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <header className="border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-normal">Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent workspace events.</p>
      </header>
      <section className="space-y-3 py-6">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">No audit events yet. Summarize or index a meeting to create events.</CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{log.action.replaceAll("_", " ").toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground">{log.targetType ?? "Workspace"} {log.targetId ?? ""}</p>
                </div>
                <time className="text-xs text-muted-foreground">{log.createdAt.toLocaleString()}</time>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
