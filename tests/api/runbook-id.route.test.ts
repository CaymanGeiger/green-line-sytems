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
    runbook: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { GET, PATCH } from "@/app/api/runbooks/[id]/route";

describe("/api/runbooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.runbook.findUnique.mockResolvedValueOnce({ teamId: "ck2234567890123456789012" });
    prismaMock.runbook.findUnique.mockResolvedValueOnce({
      id: "ck5555555555555555555555",
      title: "API runbook",
      team: { name: "Core Platform" },
      service: null,
    });
  });

  it("gets runbook detail", async () => {
    const request = new NextRequest("http://localhost:3000/api/runbooks/ck5555555555555555555555");

    const response = await GET(request, {
      params: Promise.resolve({ id: "ck5555555555555555555555" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      runbook: {
        id: "ck5555555555555555555555",
        title: "API runbook",
      },
    });
  });

  it("rejects malformed runbook patch payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/runbooks/ck5555555555555555555555", {
      method: "PATCH",
      body: JSON.stringify({ version: 0 }),
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "ck5555555555555555555555" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid runbook update payload" });
  });
});
