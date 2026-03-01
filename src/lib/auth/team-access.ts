import { prisma } from "@/lib/prisma";

export type AccessibleTeam = {
  id: string;
  name: string;
  slug: string;
  membershipRole: "OWNER" | "MEMBER";
};

export async function getAccessibleTeams(userId: string): Promise<AccessibleTeam[]> {
  const memberships = await prisma.teamMembership.findMany({
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
        },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.team.id,
    name: membership.team.name,
    slug: membership.team.slug,
    membershipRole: membership.role,
  }));
}

export async function getAccessibleTeamIds(userId: string): Promise<string[]> {
  const teams = await getAccessibleTeams(userId);
  return teams.map((team) => team.id);
}

export async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMembership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(membership);
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
