import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canUserPerformTeamActionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    incident: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    incidentTimelineEvent: {
      create: vi.fn(),
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

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, PATCH } from "@/app/api/incidents/[id]/route";

describe("/api/incidents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
    prismaMock.incident.findUnique.mockResolvedValueOnce({ teamId: "ck2234567890123456789012" });
    prismaMock.incident.findUnique.mockResolvedValueOnce({
      id: "ck3333333333333333333333",
      incidentKey: "INC-000123",
      teamId: "ck2234567890123456789012",
      title: "API timeout",
      service: null,
      team: { id: "ck2234567890123456789012", name: "Core Platform" },
      commanderUser: null,
      assignees: [],
      timelineEvents: [],
    });
  });

  it("returns incident detail for authorized user", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ck3333333333333333333333");

    const response = await GET(request, {
      params: Promise.resolve({ id: "ck3333333333333333333333" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      incident: {
        id: "ck3333333333333333333333",
        incidentKey: "INC-000123",
      },
    });
  });

  it("returns invalid update payload for malformed patch", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ck3333333333333333333333", {
      method: "PATCH",
      body: JSON.stringify({ status: "BROKEN" }),
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "ck3333333333333333333333" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid incident update payload" });
  });
});
