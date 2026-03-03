import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canUserPerformTeamActionMock,
  checkRateLimitMock,
  getClientIpMock,
  ensureTeamSimulationServicesMock,
  runSimulationPresetMock,
  resolveSimulationEventsMock,
  purgeSimulationDataMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  ensureTeamSimulationServicesMock: vi.fn(),
  runSimulationPresetMock: vi.fn(),
  resolveSimulationEventsMock: vi.fn(),
  purgeSimulationDataMock: vi.fn(),
  prismaMock: {
    logEvent: { findMany: vi.fn() },
    errorEvent: { findMany: vi.fn() },
    deployEvent: { findMany: vi.fn() },
    alertEvent: { findMany: vi.fn() },
    incident: { findMany: vi.fn() },
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

vi.mock("@/lib/auth/permissions", () => ({
  canUserPerformTeamAction: canUserPerformTeamActionMock,
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}));

vi.mock("@/lib/test-dev-ops-server", () => ({
  ensureTeamSimulationServices: ensureTeamSimulationServicesMock,
  runSimulationPreset: runSimulationPresetMock,
  resolveSimulationEvents: resolveSimulationEventsMock,
  purgeSimulationData: purgeSimulationDataMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET as getFeed } from "@/app/api/test-dev-ops/feed/route";
import { POST as runPreset } from "@/app/api/test-dev-ops/preset/route";
import { POST as recover } from "@/app/api/test-dev-ops/recover/route";
import { POST as purge } from "@/app/api/test-dev-ops/purge/route";

describe("simulator auxiliary routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 20, retryAfterMs: 0 });
    getClientIpMock.mockReturnValue("127.0.0.1");
    ensureTeamSimulationServicesMock.mockResolvedValue(undefined);
    runSimulationPresetMock.mockResolvedValue({ ok: true, emitted: 12 });
    resolveSimulationEventsMock.mockResolvedValue({ ok: true, resolvedIncidents: 3 });
    purgeSimulationDataMock.mockResolvedValue({ ok: true, deletedIncidents: 5 });
    prismaMock.logEvent.findMany.mockResolvedValue([]);
    prismaMock.errorEvent.findMany.mockResolvedValue([]);
    prismaMock.deployEvent.findMany.mockResolvedValue([]);
    prismaMock.alertEvent.findMany.mockResolvedValue([]);
    prismaMock.incident.findMany.mockResolvedValue([]);
  });

  it("loads simulator feed", async () => {
    const request = new NextRequest("http://localhost:3000/api/test-dev-ops/feed?teamId=ck2234567890123456789012");
    const response = await getFeed(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [] });
  });

  it("runs preset, recover, and purge flows", async () => {
    const presetRequest = new NextRequest("http://localhost:3000/api/test-dev-ops/preset", {
      method: "POST",
      body: JSON.stringify({
        teamId: "ck2234567890123456789012",
        preset: "LATENCY_DEGRADATION",
      }),
      headers: { "content-type": "application/json" },
    });
    const presetResponse = await runPreset(presetRequest);
    expect(presetResponse.status).toBe(200);

    const recoverRequest = new NextRequest("http://localhost:3000/api/test-dev-ops/recover", {
      method: "POST",
      body: JSON.stringify({ teamId: "ck2234567890123456789012" }),
      headers: { "content-type": "application/json" },
    });
    const recoverResponse = await recover(recoverRequest);
    expect(recoverResponse.status).toBe(200);

    const purgeRequest = new NextRequest("http://localhost:3000/api/test-dev-ops/purge", {
      method: "POST",
      body: JSON.stringify({ teamId: "ck2234567890123456789012" }),
      headers: { "content-type": "application/json" },
    });
    const purgeResponse = await purge(purgeRequest);
    expect(purgeResponse.status).toBe(200);

    await expect(presetResponse.json()).resolves.toEqual({ result: { ok: true, emitted: 12 } });
    await expect(recoverResponse.json()).resolves.toEqual({ result: { ok: true, resolvedIncidents: 3 } });
    await expect(purgeResponse.json()).resolves.toEqual({ result: { ok: true, deletedIncidents: 5 } });
  });
});
