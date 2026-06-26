"use client";

import { signIn } from "next-auth/react";
import { ArrowRight, FlaskConical, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthButtonsProps = {
  localAuthEnabled: boolean;
  emailEnabled: boolean;
  googleEnabled: boolean;
  microsoftEnabled: boolean;
};

export function AuthButtons({ localAuthEnabled, emailEnabled, googleEnabled, microsoftEnabled }: AuthButtonsProps) {
  return (
    <div className="space-y-3">
      {googleEnabled || microsoftEnabled ? (
        <div className="space-y-2">
          {googleEnabled ? (
            <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
              Continue with Google
            </Button>
          ) : null}
          {microsoftEnabled ? (
            <Button className="w-full" variant="outline" onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}>
              Continue with Microsoft
            </Button>
          ) : null}
        </div>
      ) : null}

      {localAuthEnabled ? (
        <form action="/api/local-auth/sign-in" method="post" className="space-y-3">
          <input type="hidden" name="callbackUrl" value="/dashboard" />
          <div>
            <Label htmlFor="local-email">Work email</Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Create or open your workspace with this email.</p>
          </div>
          <div className="space-y-2">
            <Input id="local-name" name="name" type="text" placeholder="Your name" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="local-email" name="email" type="email" placeholder="you@company.com" required />
              <Button type="submit" aria-label="Continue with email" className="sm:w-32">
                <ArrowRight className="h-4 w-4" />
                Continue
              </Button>
            </div>
          </div>
        </form>
      ) : emailEnabled ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            signIn("email", { email: data.get("email"), callbackUrl: "/dashboard" });
          }}
        >
          <div>
            <Label htmlFor="email">Work email</Label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="email" name="email" type="email" placeholder="you@company.com" required />
            <Button type="submit" aria-label="Send magic link" className="sm:w-32">
              <Mail className="h-4 w-4" />
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {localAuthEnabled ? (
        <form action="/api/local-auth/sign-in" method="post" className="border-t pt-3">
          <input type="hidden" name="callbackUrl" value="/dashboard" />
          <input type="hidden" name="email" value="dev@meetmind.local" />
          <input type="hidden" name="name" value="Dev User" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Explore sample data</p>
              <p className="mt-1 text-xs text-muted-foreground">Open a preloaded workspace.</p>
            </div>
            <Button type="submit" variant="outline" size="sm">
              <FlaskConical className="h-4 w-4" />
              Open
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
