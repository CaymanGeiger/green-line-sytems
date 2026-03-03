import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertCsrfMock,
  getClientIpMock,
  checkRateLimitMock,
  getUserFromRawSessionTokenMock,
} = vi.hoisted(() => ({
  assertCsrfMock: vi.fn(),
  getClientIpMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getUserFromRawSessionTokenMock: vi.fn(),
}));

vi.mock("@/lib/auth/csrf", () => ({
  assertCsrf: assertCsrfMock,
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  getClientIp: getClientIpMock,
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "dcc_session",
  getUserFromRawSessionToken: getUserFromRawSessionTokenMock,
}));

import {
  enforceMutationProtection,
  jsonError,
  jsonOk,
  requireApiUser,
} from "@/lib/api";

describe("api helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCsrfMock.mockImplementation(() => undefined);
    getClientIpMock.mockReturnValue("127.0.0.1");
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 10,
      retryAfterMs: 0,
    });
  });

  it("returns structured json responses", async () => {
    const error = jsonError("Bad request", 400);
    const ok = jsonOk({ ok: true }, { status: 201 });

    expect(error.status).toBe(400);
    await expect(error.json()).resolves.toEqual({ error: "Bad request" });
    expect(ok.status).toBe(201);
    await expect(ok.json()).resolves.toEqual({ ok: true });
  });

  it("requires valid api user from cookie header", async () => {
    getUserFromRawSessionTokenMock.mockResolvedValueOnce({ id: "user_1" });
    const request = new Request("http://localhost:3000/api/x", {
      headers: {
        cookie: "dcc_session=test_raw_token",
      },
    });

    await expect(requireApiUser(request)).resolves.toEqual({ id: "user_1" });
    expect(getUserFromRawSessionTokenMock).toHaveBeenCalledWith("test_raw_token");
  });

  it("rejects mutation when csrf fails", async () => {
    assertCsrfMock.mockImplementationOnce(() => {
      throw new Error("fail");
    });

    const result = await enforceMutationProtection(
      new Request("http://localhost:3000/api/x", { method: "POST" }),
      "incidents:create",
      5,
      60_000,
    );

    expect(result?.status).toBe(403);
  });

  it("returns retry headers on rate limit rejection", async () => {
    checkRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 3_000,
    });

    const result = await enforceMutationProtection(
      new Request("http://localhost:3000/api/x", { method: "POST" }),
      "incidents:create",
      5,
      60_000,
    );

    expect(result?.status).toBe(429);
    expect(result?.headers.get("Retry-After")).toBe("3");
  });
});
