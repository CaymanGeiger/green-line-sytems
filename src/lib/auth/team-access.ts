import { prisma } from "@/lib/prisma";

export type AccessibleOrganization = {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type AccessibleTeam = {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  membershipRole: "OWNER" | "MEMBER";
  isDirectMember: boolean;
};

type AccessibleContext = {
  organizations: AccessibleOrganization[];
  teams: AccessibleTeam[];
};

export async function getAccessibleContext(userId: string): Promise<AccessibleContext> {
  const organizationMemberships = await prisma.organizationMembership.findMany({
    where: {
      userId,
    },
    orderBy: {
      organization: {
        name: "asc",
      },
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const organizations = organizationMemberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  }));

  const organizationRoleById = new Map<string, AccessibleOrganization["role"]>();
  organizations.forEach((organization) => {
    organizationRoleById.set(organization.id, organization.role);
  });

  const manageableOrganizationIds = organizations
    .filter((organization) => organization.role === "OWNER" || organization.role === "ADMIN")
    .map((organization) => organization.id);

  const teamAccessWhere =
    manageableOrganizationIds.length > 0
      ? {
          OR: [
            {
              memberships: {
                some: {
                  userId,
                },
              },
            },
            {
              organizationId: {
                in: manageableOrganizationIds,
              },
            },
          ],
        }
      : {
          memberships: {
            some: {
              userId,
            },
          },
        };

  const teams = await prisma.team.findMany({
    where: teamAccessWhere,
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      organizationId: true,
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      memberships: {
        where: {
          userId,
        },
        take: 1,
        select: {
          role: true,
        },
      },
    },
  });

  return {
    organizations,
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      organizationId: team.organizationId,
      organizationName: team.organization.name,
      organizationSlug: team.organization.slug,
      organizationRole: organizationRoleById.get(team.organizationId) ?? null,
      membershipRole: team.memberships[0]?.role ?? "MEMBER",
      isDirectMember: team.memberships.length > 0,
    })),
  };
}

export async function getAccessibleOrganizations(userId: string): Promise<AccessibleOrganization[]> {
  const { organizations } = await getAccessibleContext(userId);
  return organizations;
}

export async function getManageableOrganizations(userId: string): Promise<AccessibleOrganization[]> {
  const organizations = await getAccessibleOrganizations(userId);
  return organizations.filter((organization) => organization.role === "OWNER" || organization.role === "ADMIN");
}

export async function getOrganizationMembershipRole(
  userId: string,
  organizationId: string,
): Promise<"OWNER" | "ADMIN" | "MEMBER" | null> {
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: {
      role: true,
    },
  });

  return membership?.role ?? null;
}

export async function hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
  const role = await getOrganizationMembershipRole(userId, organizationId);
  return Boolean(role);
}

export async function canManageOrganization(userId: string, organizationId: string): Promise<boolean> {
  const role = await getOrganizationMembershipRole(userId, organizationId);
  return role === "OWNER" || role === "ADMIN";
}

export async function isOrganizationOwner(userId: string, organizationId: string): Promise<boolean> {
  const role = await getOrganizationMembershipRole(userId, organizationId);
  return role === "OWNER";
}

export async function getAccessibleTeams(userId: string): Promise<AccessibleTeam[]> {
  const { teams } = await getAccessibleContext(userId);
  return teams;
}

export async function getAccessibleTeamIds(userId: string): Promise<string[]> {
  const teams = await getAccessibleTeams(userId);
  return teams.map((team) => team.id);
}

export async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      memberships: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
      organization: {
        select: {
          memberships: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    return false;
  }

  if (team.memberships.length > 0) {
    return true;
  }

  const organizationMembership = team.organization.memberships[0];
  if (!organizationMembership) {
    return false;
  }

  return organizationMembership.role === "OWNER" || organizationMembership.role === "ADMIN";
}

export async function getTeamMembershipRole(
  userId: string,
  teamId: string,
): Promise<"OWNER" | "MEMBER" | null> {
  const membership = await prisma.teamMembership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: {
      role: true,
    },
  });

  return membership?.role ?? null;
}

export async function isTeamOwner(userId: string, teamId: string): Promise<boolean> {
  const role = await getTeamMembershipRole(userId, teamId);
  return role === "OWNER";
}
