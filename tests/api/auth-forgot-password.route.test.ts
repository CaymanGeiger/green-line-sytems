import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  enforceMutationProtectionMock,
  getClientIpMock,
  checkRateLimitMock,
  sendResetCodeEmailMock,
  generateResetCodeMock,
  hashResetCodeMock,
  isValidResetCodeFormatMock,
  hashPasswordMock,
  validatePasswordPolicyMock,
  prismaMock,
} = vi.hoisted(() => ({
  enforceMutationProtectionMock: vi.fn(),
  getClientIpMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  sendResetCodeEmailMock: vi.fn(),
  generateResetCodeMock: vi.fn(),
  hashResetCodeMock: vi.fn(),
  isValidResetCodeFormatMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  validatePasswordPolicyMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetCode: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
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
  getClientIp: getClientIpMock,
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/auth/reset-email", () => ({
  sendResetCodeEmail: sendResetCodeEmailMock,
}));

vi.mock("@/lib/auth/reset", () => ({
  PASSWORD_RESET_TTL_MINUTES: 15,
  PASSWORD_RESET_MAX_ATTEMPTS: 5,
  generateResetCode: generateResetCodeMock,
  hashResetCode: hashResetCodeMock,
  isValidResetCodeFormat: isValidResetCodeFormatMock,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock,
  validatePasswordPolicy: validatePasswordPolicyMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST as requestReset } from "@/app/api/auth/forgot-password/request/route";
import { POST as verifyReset } from "@/app/api/auth/forgot-password/verify/route";
import { POST as doReset } from "@/app/api/auth/forgot-password/reset/route";

describe("forgot-password routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceMutationProtectionMock.mockResolvedValue(null);
    getClientIpMock.mockReturnValue("127.0.0.1");
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 10, retryAfterMs: 0 });
    generateResetCodeMock.mockReturnValue("123456");
    hashResetCodeMock.mockReturnValue("hash_123456");
    isValidResetCodeFormatMock.mockReturnValue(true);
    sendResetCodeEmailMock.mockResolvedValue(undefined);
    validatePasswordPolicyMock.mockReturnValue({ valid: true, issues: [] });
    hashPasswordMock.mockResolvedValue("hashed_password");
    prismaMock.$transaction.mockResolvedValue(undefined);
    prismaMock.user.findUnique.mockResolvedValue({ id: "ck1234567890123456789012", email: "admin@demo.dev" });
    prismaMock.passwordResetCode.findFirst.mockResolvedValue({
      id: "ck3333333333333333333333",
      codeHash: "hash_123456",
    });
    prismaMock.user.update.mockResolvedValue({ id: "ck1234567890123456789012" });
    prismaMock.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("requests a reset code with generic response", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password/request", {
      method: "POST",
      body: JSON.stringify({ email: "admin@demo.dev" }),
      headers: { "content-type": "application/json" },
    });

    const response = await requestReset(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: "If an account exists for that email, a verification code has been sent.",
    });
  });

  it("verifies valid reset code", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password/verify", {
      method: "POST",
      body: JSON.stringify({ email: "admin@demo.dev", code: "123456" }),
      headers: { "content-type": "application/json" },
    });

    const response = await verifyReset(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("resets password for valid code", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@demo.dev",
        code: "123456",
        password: "Strong@Pass1",
        confirmPassword: "Strong@Pass1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await doReset(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
