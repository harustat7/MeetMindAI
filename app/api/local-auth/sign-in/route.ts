import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultWorkspace } from "@/lib/workspace";

function localAuthEnabled() {
  const providerConfigured = Boolean(
    process.env.EMAIL_SERVER ||
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
      (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
  );

  return process.env.LOCAL_AUTH_ENABLED === "true" || (!providerConfigured && process.env.LOCAL_AUTH_ENABLED !== "false");
}

function getRedirectUrl(request: NextRequest, callbackUrl: FormDataEntryValue | null) {
  const requestedPath = typeof callbackUrl === "string" && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

  return new URL(requestedPath, request.url);
}

export async function POST(request: NextRequest) {
  if (!localAuthEnabled()) {
    return NextResponse.json({ error: "Local email auth is disabled" }, { status: 404 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "dev@meetmind.local").trim().toLowerCase();
  const name = String(formData.get("name") ?? email.split("@")[0] ?? "User").trim();

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, emailVerified: new Date() },
    update: { name, emailVerified: new Date() }
  });

  await ensureDefaultWorkspace(user);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires
    }
  });

  const response = NextResponse.redirect(getRedirectUrl(request, formData.get("callbackUrl")), { status: 303 });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires
  } as const;

  response.cookies.set("next-auth.session-token", sessionToken, cookieOptions);

  if (process.env.NODE_ENV === "production") {
    response.cookies.set("__Secure-next-auth.session-token", sessionToken, cookieOptions);
  }

  return response;
}
