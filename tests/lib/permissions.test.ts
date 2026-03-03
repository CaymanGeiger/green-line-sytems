import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teamMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    organizationMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teamPermission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  canUserPerformTeamAction,
  getTeamIdsForPermission,
} from "@/lib/auth/permissions";

describe("team permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants owners all actions", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({ organizationId: "org_1" });
    prismaMock.teamMembership.findUnique.mockResolvedValueOnce({ role: "OWNER" });
    prismaMock.organizationMembership.findUnique.mockResolvedValueOnce({ role: "MEMBER" });

    await expect(
      canUserPerformTeamAction("user_1", "team_1", "INCIDENT", "DELETE"),
    ).resolves.toBe(true);
  });

  it("grants org admins organization-managed resources", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({ organizationId: "org_1" });
    prismaMock.teamMembership.findUnique.mockResolvedValueOnce(null);
    prismaMock.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ADMIN" });

    await expect(
      canUserPerformTeamAction("user_1", "team_1", "TEAM_PERMISSION", "UPDATE"),
    ).resolves.toBe(true);
  });

  it("respects member overrides", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({ organizationId: "org_1" });
    prismaMock.teamMembership.findUnique.mockResolvedValueOnce({ role: "MEMBER" });
    prismaMock.organizationMembership.findUnique.mockResolvedValueOnce({ role: "MEMBER" });
    prismaMock.teamPermission.findUnique.mockResolvedValueOnce({ allowed: false });

    await expect(
      canUserPerformTeamAction("user_1", "team_1", "INCIDENT", "VIEW"),
    ).resolves.toBe(false);
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
