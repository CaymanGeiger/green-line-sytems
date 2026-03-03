import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canUserPerformTeamActionMock,
  userHasAnyTeamPermissionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canUserPerformTeamActionMock: vi.fn(),
  userHasAnyTeamPermissionMock: vi.fn(),
  prismaMock: {
    savedView: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
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
  userHasAnyTeamPermission: userHasAnyTeamPermissionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, POST, DELETE } from "@/app/api/saved-views/route";

describe("/api/saved-views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    userHasAnyTeamPermissionMock.mockResolvedValue(true);
    prismaMock.savedView.findMany.mockResolvedValue([]);
    prismaMock.savedView.create.mockResolvedValue({
      id: "ck8888888888888888888888",
      name: "Core incidents",
      scope: "incidents",
      filtersJson: { teamId: "ck2234567890123456789012", status: "OPEN" },
    });
    prismaMock.savedView.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("lists saved views for user", async () => {
    const request = new NextRequest("http://localhost:3000/api/saved-views");
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ savedViews: [] });
  });

  it("creates and deletes saved view", async () => {
    const createRequest = new NextRequest("http://localhost:3000/api/saved-views", {
      method: "POST",
      body: JSON.stringify({
        name: "Core incidents",
        scope: "incidents",
        filtersJson: {
          teamId: "ck2234567890123456789012",
          status: "OPEN",
        },
      }),
      headers: { "content-type": "application/json" },
    });

    const createResponse = await POST(createRequest);
    expect(createResponse.status).toBe(201);

    const deleteRequest = new NextRequest("http://localhost:3000/api/saved-views?id=ck8888888888888888888888", {
      method: "DELETE",
    });

    const deleteResponse = await DELETE(deleteRequest);
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ ok: true });
  });
});
