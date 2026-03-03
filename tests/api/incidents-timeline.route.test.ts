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

import { POST } from "@/app/api/incidents/[id]/timeline/route";

describe("POST /api/incidents/[id]/timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.incident.findUnique.mockResolvedValue({
      id: "ck3333333333333333333333",
      teamId: "ck2234567890123456789012",
    });
    prismaMock.incidentTimelineEvent.create.mockResolvedValue({
      id: "ck4444444444444444444444",
      message: "Status changed",
      type: "STATUS_CHANGED",
    });
  });

  it("rejects malformed timeline payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ck3333333333333333333333/timeline", {
      method: "POST",
      body: JSON.stringify({ type: "NOPE", message: "x" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "ck3333333333333333333333" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid timeline event payload" });
  });

  it("creates timeline event", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ck3333333333333333333333/timeline", {
      method: "POST",
      body: JSON.stringify({ type: "NOTE", message: "Investigating issue" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "ck3333333333333333333333" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      event: {
        id: "ck4444444444444444444444",
        message: "Status changed",
        type: "STATUS_CHANGED",
      },
    });
  });
});
