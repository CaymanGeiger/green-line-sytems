import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canUserPerformTeamActionMock,
  simulateServiceActionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  simulateServiceActionMock: vi.fn(),
  prismaMock: {
    service: {
      findFirst: vi.fn(),
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

vi.mock("@/lib/auth/permissions", () => ({
  canUserPerformTeamAction: canUserPerformTeamActionMock,
}));

vi.mock("@/lib/test-dev-ops-server", () => ({
  simulateServiceAction: simulateServiceActionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "@/app/api/test-dev-ops/simulate/route";

describe("POST /api/test-dev-ops/simulate", () => {
  const USER = { id: "ckuser1234567890123456789" };
  const TEAM_ID = "ckteam1234567890123456789";
  const SERVICE_ID = "ckservice12345678901234567";

  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue(USER);
    enforceMutationProtectionMock.mockResolvedValue(null);
    prismaMock.service.findFirst.mockResolvedValue({ id: SERVICE_ID, teamId: TEAM_ID });
    canUserPerformTeamActionMock.mockResolvedValue(true);
    simulateServiceActionMock.mockResolvedValue({
      serviceId: SERVICE_ID,
      serviceName: "Checkout Billing",
      kind: "CHECKOUT",
      outcome: "FAILURE",
      logsWritten: 9,
      errorWritten: true,
      alertWritten: true,
      deployWritten: false,
      incidentId: "incident_123",
      incidentKey: "INC-000111",
      simulatedResponse: {
        statusCode: 503,
        summary: "failed run",
      },
    });
  });

  it("returns unauthorized without session user", async () => {
    requireApiUserMock.mockResolvedValueOnce(null);
    const request = new NextRequest("http://localhost:3000/api/test-dev-ops/simulate", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns validation error for bad payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/test-dev-ops/simulate", {
      method: "POST",
      body: JSON.stringify({ serviceId: "bad", action: "x", expectedOutcome: "BROKEN" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid simulation payload" });
  });

  it("returns forbidden when service cannot be resolved", async () => {
    prismaMock.service.findFirst.mockResolvedValueOnce(null);
    const request = new NextRequest("http://localhost:3000/api/test-dev-ops/simulate", {
      method: "POST",
      body: JSON.stringify({
        serviceId: SERVICE_ID,
        action: "submit-checkout",
        expectedOutcome: "WARNING",
        intensity: 3,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("returns forbidden when user lacks simulator permissions", async () => {
    canUserPerformTeamActionMock.mockResolvedValueOnce(false);
    const request = new NextRequest("http://localhost:3000/api/test-dev-ops/simulate", {
      method: "POST",
      body: JSON.stringify({
        serviceId: SERVICE_ID,
        action: "submit-checkout",
        expectedOutcome: "WARNING",
        intensity: 3,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("runs simulator action and returns result payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/test-dev-ops/simulate", {
      method: "POST",
      body: JSON.stringify({
        serviceId: SERVICE_ID,
        action: "submit-checkout",
        expectedOutcome: "FAILURE",
        severityOverride: "SEV1",
        intensity: 5,
        profile: "RELEASE_DAY",
        payload: { amountUsd: 122.4 },
        faults: {
          dbLatencyMultiplier: 2,
          externalApiFailureRate: 70,
          packetLossEnabled: true,
          cpuSaturationEnabled: false,
        },
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.kind).toBe("CHECKOUT");
    expect(simulateServiceActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER.id,
        serviceId: SERVICE_ID,
        expectedOutcome: "FAILURE",
      }),
    );
  });
});
