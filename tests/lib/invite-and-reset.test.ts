import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    teamInvite: {
      findFirst: vi.fn(),
    },
    organizationInvite: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  TEAM_INVITE_TTL_HOURS,
  findActiveInviteByRawToken,
  generateTeamInviteToken,
  hashTeamInviteToken,
} from "@/lib/auth/team-invite";
import {
  ORGANIZATION_INVITE_TTL_HOURS,
  findActiveOrganizationInviteByRawToken,
  generateOrganizationInviteToken,
  hashOrganizationInviteToken,
} from "@/lib/auth/organization-invite";
import {
  PASSWORD_RESET_CODE_LENGTH,
  generateResetCode,
  hashResetCode,
  isValidResetCodeFormat,
} from "@/lib/auth/reset";

describe("invite and reset helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and hashes team invite tokens", () => {
    const token = generateTeamInviteToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashTeamInviteToken(token)).toHaveLength(64);
    expect(hashTeamInviteToken(token)).toBe(hashTeamInviteToken(token));
  });

  it("generates and hashes organization invite tokens", () => {
    const token = generateOrganizationInviteToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashOrganizationInviteToken(token)).toHaveLength(64);
    expect(hashOrganizationInviteToken(token)).toBe(hashOrganizationInviteToken(token));
  });

  it("finds active invite records by hashed token", async () => {
    prismaMock.teamInvite.findFirst.mockResolvedValueOnce({ id: "invite_1" });
    prismaMock.organizationInvite.findFirst.mockResolvedValueOnce({ id: "org_invite_1" });

    const token = "test_token_123";
    const teamInvite = await findActiveInviteByRawToken(token);
    const orgInvite = await findActiveOrganizationInviteByRawToken(token);

    expect(teamInvite).toEqual({ id: "invite_1" });
    expect(orgInvite).toEqual({ id: "org_invite_1" });

    expect(prismaMock.teamInvite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: hashTeamInviteToken(token),
          consumedAt: null,
        }),
      }),
    );
    expect(prismaMock.organizationInvite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: hashOrganizationInviteToken(token),
          consumedAt: null,
        }),
      }),
    );
  });

  it("generates and validates reset codes", () => {
    const code = generateResetCode();
    expect(code).toMatch(/^\d+$/);
    expect(code).toHaveLength(PASSWORD_RESET_CODE_LENGTH);
    expect(isValidResetCodeFormat(code)).toBe(true);
    expect(isValidResetCodeFormat("12a456")).toBe(false);
    expect(isValidResetCodeFormat("12345")).toBe(false);
    expect(hashResetCode(code)).toHaveLength(64);
  });

  it("uses expected ttl constants", () => {
    expect(TEAM_INVITE_TTL_HOURS).toBe(72);
    expect(ORGANIZATION_INVITE_TTL_HOURS).toBe(72);
  });
});
