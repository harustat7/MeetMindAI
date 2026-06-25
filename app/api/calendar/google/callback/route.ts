import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CalendarProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeGoogleCode, getGoogleProfile } from "@/lib/calendar/google";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(absoluteUrl("/sign-in"));

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_calendar_state")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(absoluteUrl("/dashboard?calendar=google_error"));
  }

  const token = await exchangeGoogleCode(code);
  const profile = await getGoogleProfile(token.access_token);

  await prisma.calendarAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: CalendarProvider.GOOGLE,
        providerAccountId: profile.sub
      }
    },
    create: {
      userId: session.user.id,
      provider: CalendarProvider.GOOGLE,
      providerAccountId: profile.sub,
      email: profile.email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000)
    },
    update: {
      userId: session.user.id,
      email: profile.email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000)
    }
  });

  return NextResponse.redirect(absoluteUrl("/dashboard?calendar=google_connected"));
}
