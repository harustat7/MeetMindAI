import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/auth-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const emailEnabled = Boolean(process.env.EMAIL_SERVER);
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const microsoftEnabled = Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  const localAuthEnabled =
    process.env.LOCAL_AUTH_ENABLED === "true" ||
    (!emailEnabled && !googleEnabled && !microsoftEnabled && process.env.LOCAL_AUTH_ENABLED !== "false");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-8">
      <div className="w-full max-w-md">
        <header className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-normal">MeetMind AI</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Import meetings, summarize decisions, and keep searchable context for your workspace.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sign in or create workspace</CardTitle>
            <CardDescription>Use your email to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthButtons
              localAuthEnabled={localAuthEnabled}
              emailEnabled={emailEnabled}
              googleEnabled={googleEnabled}
              microsoftEnabled={microsoftEnabled}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
