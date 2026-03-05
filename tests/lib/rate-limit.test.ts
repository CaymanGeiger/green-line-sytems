import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new bucket when one does not exist", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        windowStart: new Date(),
        count: 1,
      },
    ]);

    const result = await checkRateLimit({ key: "auth:1", limit: 5, windowMs: 60_000 });
    expect(result).toEqual({
      allowed: true,
      remaining: 4,
      retryAfterMs: 0,
    });
  });

  it("rejects when bucket count is over limit within window", async () => {
    const now = Date.now();
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        windowStart: new Date(now - 5_000),
        count: 6,
      },
    ]);

    const result = await checkRateLimit({ key: "auth:1", limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("increments bucket count when within limit", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        windowStart: new Date(Date.now() - 3_000),
        count: 3,
      },
    ]);

    const result = await checkRateLimit({ key: "auth:1", limit: 5, windowMs: 60_000 });
    expect(result).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
  });

  it("extracts client ip from headers", () => {
    const request = new Request("http://localhost:3000/api/auth/signin", {
      headers: {
        "x-forwarded-for": "8.8.8.8, 1.1.1.1",
      },
    });
    expect(getClientIp(request)).toBe("8.8.8.8");
  });

  it("fails open when backing storage errors", async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error("no such table: ApiRateLimitBucket"));

    const result = await checkRateLimit({ key: "auth:1", limit: 5, windowMs: 60_000 });
    expect(result).toEqual({
      allowed: true,
      remaining: 5,
      retryAfterMs: 0,
    });
  });
});
