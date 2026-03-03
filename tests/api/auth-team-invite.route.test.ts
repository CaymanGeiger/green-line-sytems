import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  enforceMutationProtectionMock,
  findActiveOrganizationInviteByRawTokenMock,
  findActiveEmployeeAccessGrantByRawTokenMock,
  hashOrganizationInviteTokenMock,
  hashEmployeeAccessGrantTokenMock,
  validatePasswordPolicyMock,
  hashPasswordMock,
  checkRateLimitMock,
  getClientIpMock,
  createSessionMock,
  attachSessionCookieMock,
  prismaMock,
} = vi.hoisted(() => ({
  enforceMutationProtectionMock: vi.fn(),
  findActiveOrganizationInviteByRawTokenMock: vi.fn(),
  findActiveEmployeeAccessGrantByRawTokenMock: vi.fn(),
  hashOrganizationInviteTokenMock: vi.fn(),
  hashEmployeeAccessGrantTokenMock: vi.fn(),
  validatePasswordPolicyMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  createSessionMock: vi.fn(),
  attachSessionCookieMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organizationInvite: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    organizationMembership: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    teamMembership: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    employeeAccessGrantInvite: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    teamPermission: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    enforceMutationProtection: enforceMutationProtectionMock,
  };
});

vi.mock("@/lib/auth/organization-invite", () => ({
  findActiveOrganizationInviteByRawToken: findActiveOrganizationInviteByRawTokenMock,
  hashOrganizationInviteToken: hashOrganizationInviteTokenMock,
}));

vi.mock("@/lib/auth/employee-access-grant", () => ({
  findActiveEmployeeAccessGrantByRawToken: findActiveEmployeeAccessGrantByRawTokenMock,
  hashEmployeeAccessGrantToken: hashEmployeeAccessGrantTokenMock,
}));

vi.mock("@/lib/auth/password", () => ({
  validatePasswordPolicy: validatePasswordPolicyMock,
  hashPassword: hashPasswordMock,
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: createSessionMock,
  attachSessionCookie: attachSessionCookieMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET as lookupInvite } from "@/app/api/auth/team-invite/route";
import { POST as acceptInvite } from "@/app/api/auth/team-invite/accept/route";
import { POST as verifyExisting } from "@/app/api/auth/team-invite/verify-existing/route";

describe("team invite routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceMutationProtectionMock.mockResolvedValue(null);
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 10, retryAfterMs: 0 });
    getClientIpMock.mockReturnValue("127.0.0.1");
    findActiveOrganizationInviteByRawTokenMock.mockResolvedValue({
      id: "ck2234567890123456789012",
      email: "new-user@demo.dev",
      role: "MEMBER",
      organization: { id: "ck3234567890123456789012", name: "BlueRidge Software" },
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    validatePasswordPolicyMock.mockReturnValue({ valid: true, issues: [] });
    hashPasswordMock.mockResolvedValue("hashed_password");
    hashOrganizationInviteTokenMock.mockReturnValue("hashed_invite_token");
    hashEmployeeAccessGrantTokenMock.mockReturnValue("hashed_employee_access_token");
    createSessionMock.mockResolvedValue({
      token: "session_token",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    attachSessionCookieMock.mockImplementation(() => undefined);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "ck4234567890123456789012",
      email: "new-user@demo.dev",
      name: "New User",
      role: "ENGINEER",
    });
    prismaMock.organizationInvite.findFirst.mockResolvedValue({
      id: "ck2234567890123456789012",
      email: "new-user@demo.dev",
      role: "MEMBER",
      organizationId: "ck3234567890123456789012",
      organization: {
        teams: [{ id: "ck5234567890123456789012" }],
      },
    });
    prismaMock.employeeAccessGrantInvite.findFirst.mockResolvedValue({
      id: "ck6234567890123456789012",
      assignmentsJson: {
        organizations: [{ organizationId: "ck3234567890123456789012", role: "MEMBER" }],
        teams: [],
      },
    });
    prismaMock.team.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
    findActiveEmployeeAccessGrantByRawTokenMock.mockResolvedValue({
      id: "ck6234567890123456789012",
      email: "new-user@demo.dev",
      assignmentsJson: {
        organizations: [{ organizationId: "ck3234567890123456789012", role: "MEMBER" }],
        teams: [],
      },
    });
  });

  it("looks up invite by token", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/team-invite?token=invite-token");

    const response = await lookupInvite(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      invite: {
        email: "new-user@demo.dev",
        role: "MEMBER",
      },
    });
  });

  it("accepts invite and creates user session", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/team-invite/accept", {
      method: "POST",
      body: JSON.stringify({
        token: "invite-token-abcdefghijklmnopqrstuvwxyz123456",
        name: "New User",
        password: "Strong@Pass1",
        confirmPassword: "Strong@Pass1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await acceptInvite(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "ck4234567890123456789012",
        email: "new-user@demo.dev",
        name: "New User",
        role: "ENGINEER",
      },
    });
    expect(attachSessionCookieMock).toHaveBeenCalledWith(
      expect.any(NextResponse),
      "session_token",
      expect.any(Date),
    );
  });

  it("verifies existing account with employee-access invite", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "ck4234567890123456789012",
      email: "new-user@demo.dev",
    });

    const request = new NextRequest("http://localhost:3000/api/auth/team-invite/verify-existing", {
      method: "POST",
      body: JSON.stringify({ token: "employee-access-token-abcdefghijklmnopqrstuvwxyz123456" }),
      headers: { "content-type": "application/json" },
    });

    const response = await verifyExisting(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
