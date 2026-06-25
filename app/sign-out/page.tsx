import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutActions } from "@/components/sign-out-actions";

export default function SignOutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Sign out of MeetMind AI?</CardTitle>
          <CardDescription>Your workspace and imported meetings will stay saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutActions />
        </CardContent>
      </Card>
    </main>
  );
}
