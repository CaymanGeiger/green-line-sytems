import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  enforceMutationProtectionMock,
  checkRateLimitMock,
  getClientIpMock,
  hashPasswordMock,
  validatePasswordPolicyMock,
  createSessionMock,
  attachSessionCookieMock,
  prismaMock,
} = vi.hoisted(() => ({
  enforceMutationProtectionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  validatePasswordPolicyMock: vi.fn(),
  createSessionMock: vi.fn(),
  attachSessionCookieMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organizationMembership: {
      create: vi.fn(),
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
  hashPassword: hashPasswordMock,
  validatePasswordPolicy: validatePasswordPolicyMock,
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: createSessionMock,
  attachSessionCookie: attachSessionCookieMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "@/app/api/auth/signup/route";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceMutationProtectionMock.mockResolvedValue(null);
    getClientIpMock.mockReturnValue("127.0.0.1");
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 5, retryAfterMs: 0 });
    validatePasswordPolicyMock.mockReturnValue({ valid: true, issues: [] });
    hashPasswordMock.mockResolvedValue("hashed_password");
    createSessionMock.mockResolvedValue({
      token: "session_token",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    attachSessionCookieMock.mockImplementation(() => undefined);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
  });

  it("returns validation error for invalid payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "bad", password: "x" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid signup payload" });
  });

  it("returns password issues when policy fails or confirm mismatch", async () => {
    validatePasswordPolicyMock.mockReturnValueOnce({
      valid: false,
      issues: ["Must include at least one uppercase letter."],
    });

    const request = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        name: "User Name",
        password: "weakpass",
        confirmPassword: "different",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Password does not meet policy requirements",
      passwordIssues: ["Must include at least one uppercase letter.", "Passwords do not match."],
    });
  });

  it("creates a user and attaches a session cookie", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: "ck1234567890123456789012",
      email: "user@example.com",
      name: "User Name",
      role: "ENGINEER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const request = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        name: "User Name",
        accountType: "EMPLOYEE",
        password: "Strong@Pass1",
        confirmPassword: "Strong@Pass1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "ck1234567890123456789012",
        email: "user@example.com",
        name: "User Name",
        role: "ENGINEER",
      },
    });

    expect(prismaMock.user.create).toHaveBeenCalled();
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
