import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  getUserFromRawSessionToken,
  issueSessionToken,
} from "@/lib/auth/session";

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues random session tokens with hash and expiry", () => {
    const first = issueSessionToken();
    const second = issueSessionToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toHaveLength(64);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("creates session rows and returns raw token", async () => {
    prismaMock.session.create.mockResolvedValueOnce({ id: "session_1" });
    const result = await createSession("user_1");

    expect(result.token).toBeTypeOf("string");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(prismaMock.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
        }),
      }),
    );
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

  it("deletes sessions by raw token hash", async () => {
    prismaMock.session.deleteMany.mockResolvedValueOnce({ count: 1 });
    await deleteSessionByToken("raw_token");

    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tokenHash: expect.any(String),
      }),
    });
  });

  it("returns null for missing or expired sessions", async () => {
    expect(await getUserFromRawSessionToken(null)).toBeNull();

    prismaMock.session.findUnique.mockResolvedValueOnce(null);
    expect(await getUserFromRawSessionToken("raw_token")).toBeNull();

    prismaMock.session.findUnique.mockResolvedValueOnce({
      id: "session_1",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      user: { id: "user_1" },
    });
    expect(await getUserFromRawSessionToken("expired_token")).toBeNull();
    expect(prismaMock.session.delete).toHaveBeenCalledWith({
      where: { id: "session_1" },
    });
  });

  it("returns session user for valid tokens", async () => {
    prismaMock.session.findUnique.mockResolvedValueOnce({
      id: "session_2",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      user: { id: "user_2", email: "u@example.com" },
    });

    await expect(getUserFromRawSessionToken("valid_token")).resolves.toEqual({
      id: "user_2",
      email: "u@example.com",
    });
  });
});
