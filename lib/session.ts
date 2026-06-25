import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function requireWorkspaceContext() {
  const user = await requireUser();
  const membership = await requireWorkspace(user);
  return {
    user,
    membership,
    workspace: membership.workspace,
    role: membership.role
  };
}
