import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultWorkspace } from "@/lib/workspace";

function devAuthEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_ENABLED === "true";
}

export async function POST(request: NextRequest) {
  if (!devAuthEnabled()) {
    return NextResponse.json({ error: "Dev auth is disabled" }, { status: 404 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "dev@meetmind.local").trim().toLowerCase();
  const name = String(formData.get("name") ?? "Dev User").trim();

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

  const response = NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
  response.cookies.set("next-auth.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires
  });

  return response;
}
