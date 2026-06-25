import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CalendarProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeMicrosoftCode, getMicrosoftProfile } from "@/lib/calendar/microsoft";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(absoluteUrl("/sign-in"));

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("microsoft_calendar_state")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(absoluteUrl("/dashboard?calendar=microsoft_error"));
  }

  const token = await exchangeMicrosoftCode(code);
  const profile = await getMicrosoftProfile(token.access_token);

  await prisma.calendarAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: CalendarProvider.MICROSOFT,
        providerAccountId: profile.id
      }
    },
    create: {
      userId: session.user.id,
      provider: CalendarProvider.MICROSOFT,
      providerAccountId: profile.id,
      email: profile.mail ?? profile.userPrincipalName,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000)
    },
    update: {
      userId: session.user.id,
      email: profile.mail ?? profile.userPrincipalName,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000)
    }
  });

  return NextResponse.redirect(absoluteUrl("/dashboard?calendar=microsoft_connected"));
}
