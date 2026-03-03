import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  getAccessibleTeamsMock,
  getManageableOrganizationsMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  getAccessibleTeamsMock: vi.fn(),
  getManageableOrganizationsMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    team: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organizationMembership: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    teamMembership: {
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

vi.mock("@/lib/auth/team-access", () => ({
  getAccessibleTeams: getAccessibleTeamsMock,
  getManageableOrganizations: getManageableOrganizationsMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, POST } from "@/app/api/account/teams/route";

describe("/api/account/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    getAccessibleTeamsMock.mockResolvedValue([{ id: "ck2234567890123456789012", name: "Core" }]);
    getManageableOrganizationsMock.mockResolvedValue([{ id: "ck3234567890123456789012", name: "BlueRidge" }]);
    prismaMock.team.findFirst.mockResolvedValue(null);
    prismaMock.team.create.mockResolvedValue({
      id: "ck2234567890123456789012",
      name: "Core Platform",
      slug: "core-platform",
      organization: {
        id: "ck3234567890123456789012",
        name: "BlueRidge",
      },
    });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
  });

  it("lists accessible teams and manageable organizations", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/teams", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      teams: [{ id: "ck2234567890123456789012", name: "Core" }],
      organizations: [{ id: "ck3234567890123456789012", name: "BlueRidge" }],
    });
  });

  it("creates a team for a manageable organization", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/teams", {
      method: "POST",
      body: JSON.stringify({ name: "Core Platform" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      team: {
        id: "ck2234567890123456789012",
        name: "Core Platform",
        slug: "core-platform",
        organization: {
          id: "ck3234567890123456789012",
          name: "BlueRidge",
        },
      },
    });
    expect(prismaMock.teamMembership.create).toHaveBeenCalledOnce();
    expect(prismaMock.organizationMembership.upsert).toHaveBeenCalledOnce();
  });
});
