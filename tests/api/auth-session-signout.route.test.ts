import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  enforceMutationProtectionMock,
  getUserFromRawSessionTokenMock,
  deleteSessionByTokenMock,
  clearSessionCookieMock,
} = vi.hoisted(() => ({
  enforceMutationProtectionMock: vi.fn(),
  getUserFromRawSessionTokenMock: vi.fn(),
  deleteSessionByTokenMock: vi.fn(),
  clearSessionCookieMock: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    enforceMutationProtection: enforceMutationProtectionMock,
  };
});

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "dcc_session",
  getUserFromRawSessionToken: getUserFromRawSessionTokenMock,
  deleteSessionByToken: deleteSessionByTokenMock,
  clearSessionCookie: clearSessionCookieMock,
}));

import { GET as sessionGet } from "@/app/api/auth/session/route";
import { POST as signoutPost } from "@/app/api/auth/signout/route";

describe("session/signout routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceMutationProtectionMock.mockResolvedValue(null);
    getUserFromRawSessionTokenMock.mockResolvedValue({
      id: "ck1234567890123456789012",
      email: "admin@demo.dev",
      name: "Admin",
    });
  });

  it("returns session user when token resolves", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      headers: { cookie: "dcc_session=session-token-123" },
    });

    const response = await sessionGet(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: {
        id: "ck1234567890123456789012",
        email: "admin@demo.dev",
      },
    });
  });

  it("signs out and clears session cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/signout", {
      method: "POST",
      headers: { cookie: "dcc_session=session-token-123" },
    });

    const response = await signoutPost(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteSessionByTokenMock).toHaveBeenCalledWith("session-token-123");
    expect(clearSessionCookieMock).toHaveBeenCalledOnce();
  });
});
