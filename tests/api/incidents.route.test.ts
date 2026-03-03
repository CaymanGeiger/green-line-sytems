import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canUserPerformTeamActionMock,
  getTeamIdsForPermissionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  getTeamIdsForPermissionMock: vi.fn(),
  prismaMock: {
    incident: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    service: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
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
  getTeamIdsForPermission: getTeamIdsForPermissionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, POST } from "@/app/api/incidents/route";

const USER = { id: "ckuser1234567890123456789" };
const TEAM_ID = "ckteam1234567890123456789";
const SERVICE_ID = "ckservice12345678901234567";
const COMMANDER_ID = "ckcommander12345678901234";

describe("incidents route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue(USER);
    enforceMutationProtectionMock.mockResolvedValue(null);
    getTeamIdsForPermissionMock.mockResolvedValue([TEAM_ID]);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.incident.findMany.mockResolvedValue([]);
    prismaMock.incident.count.mockResolvedValue(0);
  });

  it("returns unauthorized when no user for GET", async () => {
    requireApiUserMock.mockResolvedValueOnce(null);
    const request = new NextRequest("http://localhost:3000/api/incidents");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns empty list when user has no team scope", async () => {
    getTeamIdsForPermissionMock.mockResolvedValueOnce([]);
    const request = new NextRequest("http://localhost:3000/api/incidents");
    const response = await GET(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      incidents: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it("returns list payload for scoped query", async () => {
    prismaMock.incident.findMany.mockResolvedValueOnce([
      {
        id: "incident_1",
        incidentKey: "INC-000001",
        title: "API latency spike",
        severity: "SEV2",
        status: "OPEN",
        startedAt: new Date("2026-03-01T00:00:00.000Z"),
        resolvedAt: null,
        team: { name: "Core Platform" },
        service: { name: "API Gateway" },
      },
    ]);
    prismaMock.incident.count.mockResolvedValueOnce(1);

    const request = new NextRequest("http://localhost:3000/api/incidents?page=1&pageSize=10&showSimulation=1");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.incidents).toHaveLength(1);
    expect(prismaMock.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          simulated: true,
          teamId: { in: [TEAM_ID] },
        }),
      }),
    );
  });

  it("returns forbidden when user cannot create incidents", async () => {
    canUserPerformTeamActionMock.mockResolvedValueOnce(false);
    const request = new NextRequest("http://localhost:3000/api/incidents", {
      method: "POST",
      body: JSON.stringify({
        teamId: TEAM_ID,
        serviceId: SERVICE_ID,
        title: "Checkout degraded",
        severity: "SEV2",
        summary: "summary",
        impact: "impact",
        commanderUserId: COMMANDER_ID,
      }),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("creates incident, assignee, and timeline events", async () => {
    prismaMock.service.findFirst.mockResolvedValueOnce({ id: SERVICE_ID });
    prismaMock.incident.findFirst.mockResolvedValueOnce({ incidentKey: "INC-000041" });

    prismaMock.$transaction.mockImplementationOnce(
      async (
        callback: (tx: {
          incident: { create: ReturnType<typeof vi.fn> };
          incidentAssignee: { create: ReturnType<typeof vi.fn> };
          incidentTimelineEvent: { create: ReturnType<typeof vi.fn> };
        }) => Promise<unknown>,
      ) => {
      const tx = {
        incident: {
          create: vi.fn().mockResolvedValue({
            id: "incident_2",
            incidentKey: "INC-000042",
            title: "Checkout degraded",
          }),
        },
        incidentAssignee: {
          create: vi.fn().mockResolvedValue({ id: "assignee_1" }),
        },
        incidentTimelineEvent: {
          create: vi.fn().mockResolvedValue({ id: "timeline_1" }),
        },
      };
      return callback(tx);
      },
    );

    const request = new NextRequest("http://localhost:3000/api/incidents", {
      method: "POST",
      body: JSON.stringify({
        teamId: TEAM_ID,
        serviceId: SERVICE_ID,
        title: "Checkout degraded",
        severity: "SEV2",
        summary: "Checkout retries elevated",
        impact: "Payment drops observed",
        commanderUserId: COMMANDER_ID,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.incident).toEqual({
      id: "incident_2",
      incidentKey: "INC-000042",
      title: "Checkout degraded",
    });
  });
});
