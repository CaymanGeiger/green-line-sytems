import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireApiUserMock, enforceMutationProtectionMock, prismaMock } = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  prismaMock: {
    uiPreference: {
      upsert: vi.fn(),
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

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { PATCH } from "@/app/api/account/ui-preferences/route";

describe("PATCH /api/account/ui-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    prismaMock.uiPreference.upsert.mockResolvedValue({
      preferenceKey: "accordion:/incidents:overview",
      isOpen: false,
    });
  });

  it("returns invalid request for malformed payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/ui-preferences", {
      method: "PATCH",
      body: JSON.stringify({ preferenceKey: "", isOpen: true }),
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request" });
  });

  it("upserts preference for authenticated user", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/ui-preferences", {
      method: "PATCH",
      body: JSON.stringify({
        preferenceKey: "accordion:/incidents:overview",
        isOpen: false,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      preference: {
        preferenceKey: "accordion:/incidents:overview",
        isOpen: false,
      },
    });
    expect(prismaMock.uiPreference.upsert).toHaveBeenCalledOnce();
  });
});
