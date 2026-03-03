import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireApiUserMock, enforceMutationProtectionMock, hasTeamAccessMock } = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  hasTeamAccessMock: vi.fn(),
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
  hasTeamAccess: hasTeamAccessMock,
}));

import { POST } from "@/app/api/account/active-team/route";

describe("POST /api/account/active-team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012", email: "admin@demo.dev" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    hasTeamAccessMock.mockResolvedValue(true);
  });

  it("returns unauthorized without session user", async () => {
    requireApiUserMock.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/account/active-team", {
      method: "POST",
      body: JSON.stringify({ teamId: "ck2234567890123456789012" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("sets cookie and returns active team id", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/active-team", {
      method: "POST",
      body: JSON.stringify({ teamId: "ck2234567890123456789012" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, activeTeamId: "ck2234567890123456789012" });
    expect(response.headers.get("set-cookie")).toContain("dcc_active_team");
  });
});
