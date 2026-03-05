import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  enforceMutationProtectionMock,
  checkRateLimitMock,
  getClientIpMock,
  verifyPasswordMock,
  createSessionMock,
  attachSessionCookieMock,
  prismaMock,
} = vi.hoisted(() => ({
  enforceMutationProtectionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  createSessionMock: vi.fn(),
  attachSessionCookieMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    enforceMutationProtection: enforceMutationProtectionMock,
  };
});

vi.mock("@/lib/auth/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: createSessionMock,
  attachSessionCookie: attachSessionCookieMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "@/app/api/auth/signin/route";

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceMutationProtectionMock.mockResolvedValue(null);
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 3, retryAfterMs: 0 });
    getClientIpMock.mockReturnValue("127.0.0.1");
    verifyPasswordMock.mockResolvedValue(true);
    createSessionMock.mockResolvedValue({
      token: "session_token",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    attachSessionCookieMock.mockImplementation(() => undefined);
  });

  it("returns invalid credentials for malformed payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: "x" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid credentials" });
  });

  it("returns unauthorized when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const request = new NextRequest("http://localhost:3000/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "Strong@Pass1" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid credentials" });
  });

  it("returns unauthorized when password check fails", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "ck1234567890123456789012",
      email: "user@example.com",
      name: "User Name",
      role: "ENGINEER",
      passwordHash: "hash",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    verifyPasswordMock.mockResolvedValueOnce(false);

    const request = new NextRequest("http://localhost:3000/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "Wrong@Pass1" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns user payload and attaches cookie on success", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "ck1234567890123456789012",
      email: "user@example.com",
      name: "User Name",
      role: "ENGINEER",
      passwordHash: "hash",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const request = new NextRequest("http://localhost:3000/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "Strong@Pass1" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "ck1234567890123456789012",
        email: "user@example.com",
        name: "User Name",
        role: "ENGINEER",
      },
    });

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ck1234567890123456789012",
        email: "user@example.com",
        name: "User Name",
        role: "ENGINEER",
      }),
    );
    expect(attachSessionCookieMock).toHaveBeenCalledWith(
      expect.any(NextResponse),
      "session_token",
      expect.any(Date),
    );
  });
});
