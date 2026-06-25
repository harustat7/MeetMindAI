import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";

export default async function TeamPage() {
  const { workspace } = await requireWorkspaceContext();
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <header className="border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-normal">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace members and roles.</p>
      </header>
      <section className="space-y-3 py-6">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{member.user.name ?? member.user.email ?? "Unknown user"}</p>
                <p className="text-sm text-muted-foreground">{member.user.email}</p>
              </div>
              <span className="rounded-md border px-2 py-1 text-xs">{member.role.toLowerCase()}</span>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
