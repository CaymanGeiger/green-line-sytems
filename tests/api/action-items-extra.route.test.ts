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
    postmortem: {
      findFirst: vi.fn(),
    },
    actionItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST as createActionItem } from "@/app/api/action-items/route";
import { PATCH as patchActionItem, DELETE as deleteActionItem } from "@/app/api/action-items/[id]/route";

describe("action item routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canUserPerformTeamActionMock.mockResolvedValue(true);
    prismaMock.postmortem.findFirst.mockResolvedValue({
      id: "ck6666666666666666666666",
      incident: { teamId: "ck2234567890123456789012" },
    });
    prismaMock.actionItem.create.mockResolvedValue({
      id: "ck7777777777777777777777",
      title: "Patch gateway retry strategy",
      status: "OPEN",
      priority: "P2",
    });
    prismaMock.actionItem.findFirst.mockResolvedValue({
      id: "ck7777777777777777777777",
      postmortem: { incident: { teamId: "ck2234567890123456789012" } },
    });
    prismaMock.actionItem.findUnique.mockResolvedValue({
      id: "ck7777777777777777777777",
      postmortem: { incident: { teamId: "ck2234567890123456789012" } },
    });
    prismaMock.actionItem.update.mockResolvedValue({ id: "ck7777777777777777777777", title: "Updated title" });
    prismaMock.actionItem.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("creates action item", async () => {
    const request = new NextRequest("http://localhost:3000/api/action-items", {
      method: "POST",
      body: JSON.stringify({
        postmortemId: "ck6666666666666666666666",
        title: "Patch gateway retry strategy",
        status: "OPEN",
        priority: "P2",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await createActionItem(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      actionItem: {
        id: "ck7777777777777777777777",
        title: "Patch gateway retry strategy",
      },
    });
  });

  it("updates and deletes action item", async () => {
    const patchRequest = new NextRequest("http://localhost:3000/api/action-items/ck7777777777777777777777", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated title" }),
      headers: { "content-type": "application/json" },
    });

    const patchResponse = await patchActionItem(patchRequest, {
      params: Promise.resolve({ id: "ck7777777777777777777777" }),
    });
    expect(patchResponse.status).toBe(200);

    const deleteRequest = new NextRequest("http://localhost:3000/api/action-items/ck7777777777777777777777", {
      method: "DELETE",
    });

    const deleteResponse = await deleteActionItem(deleteRequest, {
      params: Promise.resolve({ id: "ck7777777777777777777777" }),
    });
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ ok: true });
  });
});
