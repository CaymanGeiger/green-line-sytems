import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teamMembership: {
      findMany: vi.fn(),
    },
    organizationMembership: {
      findMany: vi.fn(),
    },
    teamPermission: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  canUserPerformTeamActions,
  canUserPerformTeamAction,
  getTeamIdsForPermission,
} from "@/lib/auth/permissions";

describe("team permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants owners all actions", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({
      memberships: [{ role: "OWNER" }],
      permissions: [],
      organization: {
        memberships: [{ role: "MEMBER" }],
      },
    });

    await expect(
      canUserPerformTeamAction("user_1", "team_1", "INCIDENT", "DELETE"),
    ).resolves.toBe(true);
  });

  it("grants org admins organization-managed resources", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({
      memberships: [],
      permissions: [],
      organization: {
        memberships: [{ role: "ADMIN" }],
      },
    });

    await expect(
      canUserPerformTeamAction("user_1", "team_1", "TEAM_PERMISSION", "UPDATE"),
    ).resolves.toBe(true);
  });

  it("respects member overrides", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({
      memberships: [{ role: "MEMBER" }],
      permissions: [{ resource: "INCIDENT", action: "VIEW", allowed: false }],
      organization: {
        memberships: [{ role: "MEMBER" }],
      },
    });

    await expect(
      canUserPerformTeamAction("user_1", "team_1", "INCIDENT", "VIEW"),
    ).resolves.toBe(false);
  });

  it("evaluates multiple actions from one team access snapshot", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({
      memberships: [{ role: "MEMBER" }],
      permissions: [{ resource: "INCIDENT", action: "CREATE", allowed: true }],
      organization: {
        memberships: [{ role: "MEMBER" }],
      },
    });

    await expect(
      canUserPerformTeamActions("user_1", "team_1", [
        { resource: "INCIDENT", action: "VIEW" },
        { resource: "INCIDENT", action: "CREATE" },
      ]),
    ).resolves.toEqual([true, true]);
  });

  it("returns scoped team ids for view permissions", async () => {
    prismaMock.teamMembership.findMany.mockResolvedValueOnce([
      { teamId: "team_a", role: "MEMBER" },
      { teamId: "team_b", role: "OWNER" },
    ]);
    prismaMock.organizationMembership.findMany.mockResolvedValueOnce([]);
    prismaMock.teamPermission.findMany.mockResolvedValueOnce([{ teamId: "team_a", allowed: true }]);

    await expect(getTeamIdsForPermission("user_1", "INCIDENT", "VIEW")).resolves.toEqual(
      expect.arrayContaining(["team_a", "team_b"]),
    );
  });
});
