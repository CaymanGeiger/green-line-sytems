import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "dcc_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function issueSessionToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  };
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash, expiresAt } = issueSessionToken();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function deleteSessionByToken(rawToken: string | null | undefined): Promise<void> {
  if (!rawToken) {
    return;
  }

  const tokenHash = hashToken(rawToken);

  await prisma.session.deleteMany({
    where: {
      tokenHash,
    },
  });
}

export async function getUserFromRawSessionToken(rawToken: string | null | undefined) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getUserFromRawSessionToken(token);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}
