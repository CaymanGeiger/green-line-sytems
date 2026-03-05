import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  getUserFromRawSessionToken,
} from "@/lib/auth/session";

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_JWT_SECRET = "test-auth-secret-with-at-least-thirty-two-characters";
  });

  it("creates signed session tokens with expiry", async () => {
    const first = await createSession({
      id: "user_1",
      email: "user@example.com",
      name: "User Name",
      role: "ENGINEER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    const second = await createSession({
      id: "user_1",
      email: "user@example.com",
      name: "User Name",
      role: "ENGINEER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    expect(first.token).not.toBe(second.token);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("attaches and clears secure cookies", () => {
    const response = NextResponse.json({ ok: true });
    attachSessionCookie(response, "raw_token", new Date("2026-03-08T00:00:00.000Z"));
    clearSessionCookie(response);

    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=lax");
  });

  it("allows deleting session token as no-op", async () => {
    await deleteSessionByToken("raw_token");
  });

  it("returns null for missing or invalid tokens", async () => {
    expect(await getUserFromRawSessionToken(null)).toBeNull();
    expect(await getUserFromRawSessionToken("bad-token")).toBeNull();
  });

  it("returns session user for valid tokens", async () => {
    const { token } = await createSession({
      id: "user_2",
      email: "u@example.com",
      name: "User Two",
      role: "ADMIN",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await expect(getUserFromRawSessionToken(token)).resolves.toEqual({
      id: "user_2",
      email: "u@example.com",
      name: "User Two",
      role: "ADMIN",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});
