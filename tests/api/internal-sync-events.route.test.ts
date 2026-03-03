import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { checkRateLimitMock, getClientIpMock, prismaMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  prismaMock: {
    deployEvent: {
      create: vi.fn(),
    },
    errorEvent: {
      createMany: vi.fn(),
    },
    logEvent: {
      createMany: vi.fn(),
    },
    alertEvent: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    INTERNAL_SYNC_TOKEN: "internal-token-123",
  },
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "@/app/api/internal/sync/events/route";

describe("POST /api/internal/sync/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIpMock.mockReturnValue("127.0.0.1");
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 10, retryAfterMs: 0 });
    prismaMock.deployEvent.create.mockResolvedValue({ id: "ck9999999999999999999999" });
    prismaMock.errorEvent.createMany.mockResolvedValue({ count: 1 });
    prismaMock.logEvent.createMany.mockResolvedValue({ count: 1 });
    prismaMock.alertEvent.createMany.mockResolvedValue({ count: 1 });
  });

  it("rejects request without internal token", async () => {
    const request = new NextRequest("http://localhost:3000/api/internal/sync/events", {
      method: "POST",
      body: JSON.stringify({ deploys: [], errors: [], logs: [], alerts: [] }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("ingests sync payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/internal/sync/events", {
      method: "POST",
      body: JSON.stringify({
        deploys: [
          {
            serviceId: "ck2234567890123456789012",
            provider: "MANUAL",
            commitSha: "abc12345",
            status: "SUCCEEDED",
          },
        ],
        errors: [
          {
            serviceId: "ck2234567890123456789012",
            provider: "MANUAL",
            fingerprint: "fp-1",
            title: "Timeout",
            level: "ERROR",
            firstSeenAt: "2026-03-01T18:00:00.000Z",
            lastSeenAt: "2026-03-01T18:05:00.000Z",
            occurrences: 3,
          },
        ],
        logs: [
          {
            serviceId: "ck2234567890123456789012",
            level: "ERROR",
            message: "Gateway timeout",
            timestamp: "2026-03-01T18:05:00.000Z",
            source: "simulator",
          },
        ],
        alerts: [
          {
            serviceId: "ck2234567890123456789012",
            source: "MANUAL",
            alertKey: "alert-1",
            title: "Timeout spike",
            severity: "HIGH",
            triggeredAt: "2026-03-01T18:05:00.000Z",
            status: "TRIGGERED",
          },
        ],
      }),
      headers: {
        "content-type": "application/json",
        "x-internal-token": "internal-token-123",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ingested: {
        deploys: 1,
        errors: 1,
        logs: 1,
        alerts: 1,
      },
    });
  });
});
