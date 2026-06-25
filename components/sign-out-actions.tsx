"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button onClick={() => signOut({ callbackUrl: "/sign-in" })}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard">Stay signed in</Link>
      </Button>
    </div>
  );
}
