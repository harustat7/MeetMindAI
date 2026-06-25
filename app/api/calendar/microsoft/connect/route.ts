import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMicrosoftCalendarAuthUrl } from "@/lib/calendar/microsoft";
import { absoluteUrl } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(absoluteUrl("/sign-in"));
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.redirect(absoluteUrl("/dashboard?calendar=microsoft_not_configured"));
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("microsoft_calendar_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });

  return NextResponse.redirect(getMicrosoftCalendarAuthUrl(state));
}
