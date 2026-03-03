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
    incident: {
      findUnique: vi.fn(),
    },
    postmortem: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    actionItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
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
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, PUT } from "@/app/api/postmortems/[incidentId]/route";

describe("/api/postmortems/[incidentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.incident.findUnique.mockResolvedValue({ teamId: "ck2234567890123456789012", id: "ck3333333333333333333333" });
    prismaMock.postmortem.findUnique.mockResolvedValue({
      id: "ck6666666666666666666666",
      incidentId: "ck3333333333333333333333",
      actionItems: [],
    });
  });

  it("gets postmortem with action items", async () => {
    const request = new NextRequest("http://localhost:3000/api/postmortems/ck3333333333333333333333");

    const response = await GET(request, {
      params: Promise.resolve({ incidentId: "ck3333333333333333333333" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      postmortem: {
        id: "ck6666666666666666666666",
        incidentId: "ck3333333333333333333333",
        actionItems: [],
      },
    });
  });

  it("rejects malformed postmortem payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/postmortems/ck3333333333333333333333", {
      method: "PUT",
      body: JSON.stringify({ whatHappened: "short" }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request, {
      params: Promise.resolve({ incidentId: "ck3333333333333333333333" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid postmortem payload" });
  });
});
