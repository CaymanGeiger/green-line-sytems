import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "dcc_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_TOKEN_VERSION = "v1";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "IC" | "ENGINEER" | "VIEWER";
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SessionTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: "ADMIN" | "IC" | "ENGINEER" | "VIEWER";
  createdAt: string;
  updatedAt: string;
  jti: string;
  iat: number;
  exp: number;
};

function getSessionSecret(): string {
  return env.AUTH_JWT_SECRET;
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function encodePayload(payload: SessionTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encodedPayload: string): SessionTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionTokenPayload;
    if (
      typeof parsed?.sub !== "string" ||
      typeof parsed?.email !== "string" ||
      typeof parsed?.name !== "string" ||
      typeof parsed?.role !== "string" ||
      typeof parsed?.createdAt !== "string" ||
      typeof parsed?.updatedAt !== "string" ||
      typeof parsed?.jti !== "string" ||
      typeof parsed?.iat !== "number" ||
      typeof parsed?.exp !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function issueSessionToken(user: SessionUser): { token: string; expiresAt: Date } {
  const issuedAtMs = Date.now();
  const expiresAt = new Date(issuedAtMs + SESSION_DURATION_MS);
  const payload: SessionTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
    jti: crypto.randomBytes(8).toString("base64url"),
    iat: Math.floor(issuedAtMs / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);
  const token = `${SESSION_TOKEN_VERSION}.${encodedPayload}.${signature}`;
  return { token, expiresAt };
}

function parseSessionToken(rawToken: string): SessionTokenPayload | null {
  const [version, encodedPayload, signature] = rawToken.split(".");
  if (version !== SESSION_TOKEN_VERSION || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!timingSafeEqualString(expectedSignature, signature)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return null;
  }

  if (payload.exp * 1000 < Date.now()) {
    return null;
  }

  return payload;
}

export async function createSession(user: SessionUser): Promise<{ token: string; expiresAt: Date }> {
  return issueSessionToken(user);
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
  void rawToken;
}

export async function getUserFromRawSessionToken(rawToken: string | null | undefined) {
  if (!rawToken) {
    return null;
  }

  const payload = parseSessionToken(rawToken);
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

const getCurrentUserCached = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getUserFromRawSessionToken(token);
});

export async function getCurrentUser() {
  return getCurrentUserCached();
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}
