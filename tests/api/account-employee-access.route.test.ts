import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireApiUserMock,
  enforceMutationProtectionMock,
  extractEmployeeAccessRequestTokenMock,
  parseEmployeeAccessRequestTokenMock,
  sendEmployeeAccessVerificationEmailMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireApiUserMock: vi.fn(),
  enforceMutationProtectionMock: vi.fn(),
  extractEmployeeAccessRequestTokenMock: vi.fn(),
  parseEmployeeAccessRequestTokenMock: vi.fn(),
  sendEmployeeAccessVerificationEmailMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    organizationMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    employeeAccessGrantInvite: {
      update: vi.fn(),
      updateMany: vi.fn(),
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

vi.mock("@/lib/auth/employee-access-request-link", () => ({
  extractEmployeeAccessRequestToken: extractEmployeeAccessRequestTokenMock,
  parseEmployeeAccessRequestToken: parseEmployeeAccessRequestTokenMock,
}));

vi.mock("@/lib/auth/team-invite-email", () => ({
  sendEmployeeAccessVerificationEmail: sendEmployeeAccessVerificationEmailMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET as getOptions } from "@/app/api/account/employee-access/options/route";
import { POST as resolveLink } from "@/app/api/account/employee-access/resolve/route";
import { POST as issueInvite } from "@/app/api/account/employee-access/issue/route";

describe("employee access routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: "ck1234567890123456789012", name: "Admin User" });
    enforceMutationProtectionMock.mockResolvedValue(null);
    extractEmployeeAccessRequestTokenMock.mockReturnValue("token_123");
    parseEmployeeAccessRequestTokenMock.mockReturnValue({
      userId: "ck4234567890123456789012",
      email: "employee@demo.dev",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    sendEmployeeAccessVerificationEmailMock.mockResolvedValue("delivery_123");
    prismaMock.organizationMembership.findFirst.mockResolvedValue({ id: "ck5555555555555555555555" });
    prismaMock.organizationMembership.findMany.mockResolvedValue([
      {
        organizationId: "ck3234567890123456789012",
        role: "OWNER",
        organization: {
          id: "ck3234567890123456789012",
          name: "BlueRidge Software",
          teams: [{ id: "ck2234567890123456789012", name: "Core Platform" }],
        },
      },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "ck4234567890123456789012",
      name: "Employee User",
      email: "employee@demo.dev",
    });
    prismaMock.team.findMany.mockResolvedValue([
      { id: "ck2234567890123456789012", organizationId: "ck3234567890123456789012" },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
    prismaMock.employeeAccessGrantInvite.create.mockResolvedValue({ id: "ck6666666666666666666666" });
  });

  it("returns manageable organizations and teams", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/employee-access/options");
    const response = await getOptions(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      organizations: [
        {
          id: "ck3234567890123456789012",
          name: "BlueRidge Software",
          actorRole: "OWNER",
          teams: [{ id: "ck2234567890123456789012", name: "Core Platform" }],
        },
      ],
    });
  });

  it("resolves employee request link", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/employee-access/resolve", {
      method: "POST",
      body: JSON.stringify({ link: "http://localhost:3000/organizations?employeeAccessRequest=token_123" }),
      headers: { "content-type": "application/json" },
    });

    const response = await resolveLink(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      request: {
        email: "employee@demo.dev",
        userId: "ck4234567890123456789012",
      },
    });
  });

  it("issues verification invite with selected org/team assignments", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/employee-access/issue", {
      method: "POST",
      body: JSON.stringify({
        link: "http://localhost:3000/organizations?employeeAccessRequest=token_123",
        organizations: [{ organizationId: "ck3234567890123456789012", role: "MEMBER" }],
        teams: [{ teamId: "ck2234567890123456789012", role: "MEMBER" }],
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await issueInvite(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      email: "employee@demo.dev",
      deliveryId: "delivery_123",
    });
    expect(sendEmployeeAccessVerificationEmailMock).toHaveBeenCalledOnce();
  });
});
