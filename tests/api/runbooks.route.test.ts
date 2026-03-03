import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  getTeamIdsForPermissionMock,
  canUserPerformTeamActionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  getTeamIdsForPermissionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  prismaMock: {
    runbook: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
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
  getTeamIdsForPermission: getTeamIdsForPermissionMock,
  canUserPerformTeamAction: canUserPerformTeamActionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, POST } from "@/app/api/runbooks/route";

describe("/api/runbooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    getTeamIdsForPermissionMock.mockResolvedValue(["ck2234567890123456789012"]);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.runbook.findMany.mockResolvedValue([]);
    prismaMock.runbook.create.mockResolvedValue({
      id: "ck5555555555555555555555",
      title: "API runbook",
      slug: "api-runbook",
      version: 1,
    });
  });

  it("lists runbooks for allowed team scope", async () => {
    const request = new NextRequest("http://localhost:3000/api/runbooks?teamId=ck2234567890123456789012");

    const response = await GET(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ runbooks: [] });
  });

  it("creates runbook", async () => {
    const request = new NextRequest("http://localhost:3000/api/runbooks", {
      method: "POST",
      body: JSON.stringify({
        teamId: "ck2234567890123456789012",
        title: "API runbook",
        slug: "api-runbook",
        markdown: "# Steps\n1. Check gateway logs.",
        tags: ["api"],
        version: 1,
        isActive: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      runbook: {
        id: "ck5555555555555555555555",
        title: "API runbook",
        slug: "api-runbook",
        version: 1,
      },
    });
  });
});
