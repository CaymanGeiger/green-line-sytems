import { PermissionAction, PermissionResource, TeamMembershipRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { defaultPermissionByMembershipRole } from "@/lib/auth/permission-defaults";
import {
  PERMISSION_ACTIONS as PERMISSION_ACTIONS_METADATA,
  PERMISSION_RESOURCE_DEFINITIONS as PERMISSION_RESOURCE_DEFINITIONS_METADATA,
} from "@/lib/auth/permission-metadata";

export const PERMISSION_ACTIONS: PermissionAction[] = [...PERMISSION_ACTIONS_METADATA];
export const PERMISSION_RESOURCE_DEFINITIONS: Array<{
  resource: PermissionResource;
  label: string;
  description: string;
}> = PERMISSION_RESOURCE_DEFINITIONS_METADATA.map((definition) => ({
  resource: definition.resource,
  label: definition.label,
  description: definition.description,
}));

export function defaultPermissionForRole(
  role: TeamMembershipRole,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (role === "OWNER") {
    return true;
  }

  if (role !== "MEMBER") {
    return false;
  }

  return defaultPermissionByMembershipRole(role, resource, action);
}

export async function canUserPerformTeamAction(
  userId: string,
  teamId: string,
  resource: PermissionResource,
  action: PermissionAction,
): Promise<boolean> {
  const [teamScope, membership] = await Promise.all([
    prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        organizationId: true,
      },
    }),
    prisma.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: {
        role: true,
      },
    }),
  ]);

  if (!teamScope) {
    return false;
  }

  const organizationMembership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: teamScope.organizationId,
      },
    },
    select: {
      role: true,
    },
  });

  const isOrganizationAdmin =
    organizationMembership?.role === "OWNER" || organizationMembership?.role === "ADMIN";

  if (isOrganizationAdmin) {
    return true;
  }

  if (!membership) {
    return false;
  }

  if (membership.role === "OWNER") {
    return true;
  }

  const override = await prisma.teamPermission.findUnique({
    where: {
      teamId_userId_resource_action: {
        teamId,
        userId,
        resource,
        action,
      },
    },
    select: {
      allowed: true,
    },
  });

  if (override) {
    return override.allowed;
  }

  return defaultPermissionForRole(membership.role, resource, action);
}

export async function getTeamIdsForPermission(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction,
  candidateTeamIds?: string[],
): Promise<string[]> {
  const [memberships, organizationAdminMemberships] = await Promise.all([
    prisma.teamMembership.findMany({
      where: {
        userId,
        ...(candidateTeamIds && candidateTeamIds.length > 0
          ? {
              teamId: {
                in: candidateTeamIds,
              },
            }
          : {}),
      },
      select: {
        teamId: true,
        role: true,
      },
    }),
    prisma.organizationMembership.findMany({
      where: {
        userId,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      select: {
        organizationId: true,
      },
    }),
  ]);

  const teamIdSet = new Set<string>();

  if (organizationAdminMemberships.length > 0) {
    const organizationIds = organizationAdminMemberships.map((membership) => membership.organizationId);
    const organizationTeams = await prisma.team.findMany({
      where: {
        organizationId: {
          in: organizationIds,
        },
        ...(candidateTeamIds && candidateTeamIds.length > 0
          ? {
              id: {
                in: candidateTeamIds,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });
    organizationTeams.forEach((team) => teamIdSet.add(team.id));
  }

  if (memberships.length === 0) {
    return [...teamIdSet];
  }

  const memberTeamIds = memberships.filter((membership) => membership.role === "MEMBER").map((membership) => membership.teamId);

  const overrides =
    memberTeamIds.length > 0
      ? await prisma.teamPermission.findMany({
          where: {
            userId,
            resource,
            action,
            teamId: {
              in: memberTeamIds,
            },
          },
          select: {
            teamId: true,
            allowed: true,
          },
        })
      : [];

  const overrideMap = new Map<string, boolean>();
  overrides.forEach((row) => {
    overrideMap.set(row.teamId, row.allowed);
  });

  memberships
    .filter((membership) => {
      if (membership.role === "OWNER") {
        return true;
      }

      const override = overrideMap.get(membership.teamId);
      if (typeof override === "boolean") {
        return override;
      }

      return defaultPermissionForRole(membership.role, resource, action);
    })
    .forEach((membership) => {
      teamIdSet.add(membership.teamId);
    });

  return [...teamIdSet];
}

export async function userHasAnyTeamPermission(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction,
): Promise<boolean> {
  const teamIds = await getTeamIdsForPermission(userId, resource, action);
  return teamIds.length > 0;
}
