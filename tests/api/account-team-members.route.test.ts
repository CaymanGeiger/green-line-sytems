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

import { GET, POST } from "@/app/api/account/teams/[teamId]/members/route";

describe("/api/account/teams/[teamId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.team.findUnique.mockResolvedValue({
      id: "ck2234567890123456789012",
      name: "Core Platform",
      slug: "core-platform",
      organizationId: "ck3234567890123456789012",
      memberships: [],
      organization: {
        memberships: [],
      },
    });
  });

  it("returns team members for allowed users", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/teams/ck2234567890123456789012/members");

    const response = await GET(request, {
      params: Promise.resolve({ teamId: "ck2234567890123456789012" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      team: {
        id: "ck2234567890123456789012",
        name: "Core Platform",
      },
    });
  });

  it("returns invalid payload when add body is malformed", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/teams/ck2234567890123456789012/members", {
      method: "POST",
      body: JSON.stringify({ role: "MEMBER" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ teamId: "ck2234567890123456789012" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid team member payload" });
  });
});
