import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  canManageOrganizationMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  canManageOrganizationMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organizationMembership: {
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
  canManageOrganization: canManageOrganizationMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST as createOrganization } from "@/app/api/account/organizations/route";
import { PATCH as updateOrganization } from "@/app/api/account/organizations/[organizationId]/route";

describe("organization routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    canManageOrganizationMock.mockResolvedValue(true);
    prismaMock.organization.findUnique.mockResolvedValue(null);
    prismaMock.organization.create.mockResolvedValue({
      id: "ck3234567890123456789012",
      name: "BlueRidge Software",
      slug: "blueridge-software",
    });
    prismaMock.organization.update.mockResolvedValue({
      id: "ck3234567890123456789012",
      name: "BlueRidge Software, Inc.",
    });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
  });

  it("creates an organization for authenticated user", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/organizations", {
      method: "POST",
      body: JSON.stringify({ name: "BlueRidge Software" }),
      headers: { "content-type": "application/json" },
    });

    const response = await createOrganization(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      organization: {
        id: "ck3234567890123456789012",
        name: "BlueRidge Software",
        slug: "blueridge-software",
      },
    });
  });

  it("updates organization name when user can manage it", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/organizations/ck3234567890123456789012", {
      method: "PATCH",
      body: JSON.stringify({ name: "BlueRidge Software, Inc." }),
      headers: { "content-type": "application/json" },
    });

    const response = await updateOrganization(request, {
      params: Promise.resolve({ organizationId: "ck3234567890123456789012" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      organization: {
        id: "ck3234567890123456789012",
        name: "BlueRidge Software, Inc.",
      },
    });
  });
});
