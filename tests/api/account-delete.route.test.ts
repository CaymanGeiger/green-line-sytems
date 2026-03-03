import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  hashPasswordMock,
  verifyPasswordMock,
  deleteSessionByTokenMock,
  clearSessionCookieMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  deleteSessionByTokenMock: vi.fn(),
  clearSessionCookieMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      deleteMany: vi.fn(),
    },
    organizationMembership: {
      update: vi.fn(),
    },
    incident: {
      updateMany: vi.fn(),
    },
    runbook: {
      updateMany: vi.fn(),
    },
    postmortem: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    requireApiUser: requireApiUserMock,
    enforceMutationProtection: enforceMutationProtectionMock,
  };
});

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "dcc_session",
  deleteSessionByToken: deleteSessionByTokenMock,
  clearSessionCookie: clearSessionCookieMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "@/app/api/account/delete/route";

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    verifyPasswordMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValue("hashed_deleted_account_password");
    prismaMock.user.findUnique.mockResolvedValue({
      id: "ck1234567890123456789012",
      passwordHash: "existing_hash",
      organizationMemberships: [],
    });
    prismaMock.user.upsert.mockResolvedValue({ id: "ck7234567890123456789012" });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
  });

  it("rejects deletion when confirmation phrase is wrong", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/delete", {
      method: "POST",
      body: JSON.stringify({
        mode: "FULL_DELETE",
        currentPassword: "Strong@Pass1",
        confirmation: "DELETE",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid confirmation phrase" });
  });

  it("deletes account and clears session cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/delete", {
      method: "POST",
      body: JSON.stringify({
        mode: "FULL_DELETE",
        currentPassword: "Strong@Pass1",
        confirmation: "DELETE ACCOUNT",
      }),
      headers: {
        "content-type": "application/json",
        cookie: "dcc_session=session-token-123",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteSessionByTokenMock).toHaveBeenCalledWith("session-token-123");
    expect(clearSessionCookieMock).toHaveBeenCalledOnce();
  });
});
