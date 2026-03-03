import { beforeEach, describe, expect, it, vi } from "vitest";

const { txMock, prismaMock } = vi.hoisted(() => ({
  txMock: {
    apiRateLimitBucket: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) =>
      callback(txMock),
    );
  });

  it("creates a new bucket when one does not exist", async () => {
    txMock.apiRateLimitBucket.findUnique.mockResolvedValueOnce(null);
    txMock.apiRateLimitBucket.create.mockResolvedValueOnce({});

    const result = await checkRateLimit({ key: "auth:1", limit: 5, windowMs: 60_000 });
    expect(result).toEqual({
      allowed: true,
      remaining: 4,
      retryAfterMs: 0,
    });
  });

  it("rejects when bucket count is over limit within window", async () => {
    const now = Date.now();
    txMock.apiRateLimitBucket.findUnique.mockResolvedValueOnce({
      key: "auth:1",
      windowStart: new Date(now - 5_000),
      count: 5,
    });

    const result = await checkRateLimit({ key: "auth:1", limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("increments bucket count when within limit", async () => {
    const now = Date.now();
    txMock.apiRateLimitBucket.findUnique.mockResolvedValueOnce({
      key: "auth:1",
      windowStart: new Date(now - 3_000),
      count: 2,
    });
    txMock.apiRateLimitBucket.update.mockResolvedValueOnce({ count: 3 });

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
});
