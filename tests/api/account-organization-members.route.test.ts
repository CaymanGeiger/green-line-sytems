import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canManageOrganizationMock,
  getOrganizationMembershipRoleMock,
  hasOrganizationAccessMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canManageOrganizationMock: vi.fn(),
  getOrganizationMembershipRoleMock: vi.fn(),
  hasOrganizationAccessMock: vi.fn(),
  prismaMock: {
    organization: {
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

vi.mock("@/lib/auth/team-access", () => ({
  canManageOrganization: canManageOrganizationMock,
  getOrganizationMembershipRole: getOrganizationMembershipRoleMock,
  hasOrganizationAccess: hasOrganizationAccessMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/team-invite-email", () => ({
  sendOrganizationInviteEmail: vi.fn(),
  sendOrganizationMembershipAddedEmail: vi.fn(),
}));

import { GET, POST } from "@/app/api/account/organizations/[organizationId]/members/route";

describe("/api/account/organizations/[organizationId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012", name: "Admin User" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canManageOrganizationMock.mockResolvedValue(true);
    getOrganizationMembershipRoleMock.mockResolvedValue("OWNER");
    hasOrganizationAccessMock.mockResolvedValue(true);
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "ck3234567890123456789012",
      name: "BlueRidge Software",
      slug: "blueridge-software",
      memberships: [],
      invites: [],
    });
  });

  it("returns organization members payload", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/account/organizations/ck3234567890123456789012/members",
    );

    const response = await GET(request, {
      params: Promise.resolve({ organizationId: "ck3234567890123456789012" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      organization: {
        id: "ck3234567890123456789012",
        name: "BlueRidge Software",
        slug: "blueridge-software",
        memberships: [],
        invites: [],
      },
    });
  });

  it("returns invalid payload when add member body is malformed", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/account/organizations/ck3234567890123456789012/members",
      {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ organizationId: "ck3234567890123456789012" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid organization member payload" });
  });
});
