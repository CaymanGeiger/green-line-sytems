import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireApiUserMock, enforceMutationProtectionMock, canUserPerformTeamActionMock, prismaMock } = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  prismaMock: {
    team: {
      findUnique: vi.fn(),
    },
    teamMembership: {
      findMany: vi.fn(),
    },
    teamPermission: {
      findMany: vi.fn(),
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

import { GET, PUT } from "@/app/api/account/teams/[teamId]/permissions/route";

describe("/api/account/teams/[teamId]/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.team.findUnique.mockResolvedValue({
      id: "ck2234567890123456789012",
      name: "Core Platform",
      slug: "core-platform",
    });
    prismaMock.teamMembership.findMany.mockResolvedValue([]);
    prismaMock.teamPermission.findMany.mockResolvedValue([]);
  });

  it("returns team permissions payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/teams/ck2234567890123456789012/permissions");

    const response = await GET(request, {
      params: Promise.resolve({ teamId: "ck2234567890123456789012" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      team: {
        id: "ck2234567890123456789012",
        name: "Core Platform",
        slug: "core-platform",
      },
      members: [],
      overrides: [],
    });
  });

  it("returns invalid payload when updates body is malformed", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/teams/ck2234567890123456789012/permissions", {
      method: "PUT",
      body: JSON.stringify({ updates: [{ bad: true }] }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request, {
      params: Promise.resolve({ teamId: "ck2234567890123456789012" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid permissions payload" });
  });
});
