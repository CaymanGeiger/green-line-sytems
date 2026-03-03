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

export async function getAccessibleOrganizations(userId: string): Promise<AccessibleOrganization[]> {
  const memberships = await prisma.organizationMembership.findMany({
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

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  }));
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
  const [teamMemberships, manageableOrganizations] = await Promise.all([
    prisma.teamMembership.findMany({
      where: {
        userId,
      },
      orderBy: {
        team: {
          name: "asc",
        },
      },
      select: {
        role: true,
        team: {
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
          },
        },
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
        role: true,
      },
    }),
  ]);

  const teamsById = new Map<string, AccessibleTeam>();

  teamMemberships.forEach((membership) => {
    teamsById.set(membership.team.id, {
      id: membership.team.id,
      name: membership.team.name,
      slug: membership.team.slug,
      organizationId: membership.team.organizationId,
      organizationName: membership.team.organization.name,
      organizationSlug: membership.team.organization.slug,
      organizationRole: manageableOrganizations.find((organization) => organization.organizationId === membership.team.organizationId)?.role ?? null,
      membershipRole: membership.role,
      isDirectMember: true,
    });
  });

  const manageableOrganizationIds = manageableOrganizations.map((organization) => organization.organizationId);
  if (manageableOrganizationIds.length === 0) {
    return [...teamsById.values()];
  }

  const orgTeams = await prisma.team.findMany({
    where: {
      organizationId: {
        in: manageableOrganizationIds,
      },
    },
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
    },
  });

  orgTeams.forEach((team) => {
    if (teamsById.has(team.id)) {
      return;
    }

    const organizationRole = manageableOrganizations.find((organization) => organization.organizationId === team.organizationId)?.role ?? null;
    teamsById.set(team.id, {
      id: team.id,
      name: team.name,
      slug: team.slug,
      organizationId: team.organizationId,
      organizationName: team.organization.name,
      organizationSlug: team.organization.slug,
      organizationRole,
      membershipRole: "MEMBER",
      isDirectMember: false,
    });
  });

  return [...teamsById.values()].sort((left, right) => left.name.localeCompare(right.name));
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
