import { CreateOrganizationForm } from "@/components/account/create-organization-form";
import {
  OrganizationMembersManager,
  type OrganizationRecord,
} from "@/components/account/organization-members-manager";
import { type TeamRecord } from "@/components/account/team-members-manager";
import { AccordionCard } from "@/components/ui/accordion-card";
import { PERMISSION_ACTIONS, PERMISSION_RESOURCE_DEFINITIONS } from "@/lib/auth/permission-metadata";
import { canUserPerformTeamActions } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { getAccessibleTeams } from "@/lib/auth/team-access";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const focusAction = getStringParam(params.focusAction);
  const requestedFocusOrganizationId = getStringParam(params.focusOrganizationId);
  const focusOrganizationId = focusAction === "add-member" ? requestedFocusOrganizationId : undefined;
  const [accessibleTeams, organizationMemberships] = await Promise.all([
    getAccessibleTeams(user.id),
    prisma.organizationMembership.findMany({
      where: {
        userId: user.id,
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
    }),
  ]);

  const organizationIds = organizationMemberships.map((membership) => membership.organization.id);

  const [organizationsData, teamsWithMembers, teamPermissionRows] = await Promise.all([
    prisma.organization.findMany({
      where: {
        id: {
          in: organizationIds,
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        memberships: {
          orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        invites: {
          where: {
            consumedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.team.findMany({
      where: {
        id: {
          in: accessibleTeams.map((team) => team.id),
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
        memberships: {
          orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.teamPermission.findMany({
      where: {
        teamId: {
          in: accessibleTeams.map((team) => team.id),
        },
      },
      select: {
        teamId: true,
        userId: true,
        resource: true,
        action: true,
        allowed: true,
      },
    }),
  ]);

  const totalPermissionCells = PERMISSION_RESOURCE_DEFINITIONS.length * PERMISSION_ACTIONS.length;
  const permissionStateByTeamUser = new Map<string, Map<string, boolean>>();
  teamPermissionRows.forEach((row) => {
    const compositeKey = `${row.teamId}:${row.userId}`;
    const permissionKey = `${row.resource}:${row.action}`;
    const existing = permissionStateByTeamUser.get(compositeKey) ?? new Map<string, boolean>();
    existing.set(permissionKey, row.allowed);
    permissionStateByTeamUser.set(compositeKey, existing);
  });

  const teamAdminsByTeamId = new Map<string, Set<string>>();
  permissionStateByTeamUser.forEach((permissions, compositeKey) => {
    if (permissions.size !== totalPermissionCells || [...permissions.values()].some((allowed) => !allowed)) {
      return;
    }

    const [teamId, userId] = compositeKey.split(":");
    if (!teamId || !userId) {
      return;
    }

    const teamAdminUserIds = teamAdminsByTeamId.get(teamId) ?? new Set<string>();
    teamAdminUserIds.add(userId);
    teamAdminsByTeamId.set(teamId, teamAdminUserIds);
  });

  const canManageByTeamId = new Map(
    await Promise.all(
      teamsWithMembers.map(async (team) => {
        const [canCreate, canUpdate, canDelete] = await canUserPerformTeamActions(user.id, team.id, [
          { resource: "TEAM_MEMBER", action: "CREATE" },
          { resource: "TEAM_MEMBER", action: "UPDATE" },
          { resource: "TEAM_MEMBER", action: "DELETE" },
        ]);
        return [team.id, canCreate || canUpdate || canDelete] as const;
      }),
    ),
  );

  const accessByTeamId = new Map(accessibleTeams.map((team) => [team.id, team]));
  const organizationById = new Map(organizationsData.map((organization) => [organization.id, organization]));
  const teamsByOrganizationId: Record<string, TeamRecord[]> = {};

  teamsWithMembers.forEach((team) => {
    const access = accessByTeamId.get(team.id);
    const organization = organizationById.get(team.organizationId);
    if (!access || !organization) {
      return;
    }

    const currentUserRole: "OWNER" | "MEMBER" | "ORG_OWNER" | "ORG_ADMIN" =
      access.organizationRole === "OWNER"
        ? "ORG_OWNER"
        : access.isDirectMember
          ? access.membershipRole
          : "ORG_ADMIN";

    const directMembershipByUserId = new Map(
      team.memberships.map((entry) => [
        entry.user.id,
        {
          role: entry.role,
          user: entry.user,
        },
      ]),
    );
    const directUserIds = new Set(team.memberships.map((entry) => entry.user.id));
    const teamAdminUserIds = teamAdminsByTeamId.get(team.id) ?? new Set<string>();
    const members = organization.memberships
      .flatMap((membership) => {
        const directMembership = directMembershipByUserId.get(membership.user.id);
        const isOrgAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
        const isTeamAdmin = teamAdminUserIds.has(membership.user.id);

        if (directMembership?.role === "OWNER") {
          return {
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            role: "OWNER" as const,
            source: "TEAM" as const,
          };
        }

        if (isOrgAdmin) {
          return {
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            role: "ADMIN" as const,
            source: "ORGANIZATION" as const,
          };
        }

        if (directMembership) {
          return {
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            role: isTeamAdmin ? ("ADMIN" as const) : ("MEMBER" as const),
            source: "TEAM" as const,
          };
        }

        return [];
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    const record: TeamRecord = {
      id: team.id,
      name: team.name,
      slug: team.slug,
      organizationName: organization.name,
      currentUserRole,
      canManageMembers: canManageByTeamId.get(team.id) ?? false,
      members,
      availableMembers: organization.memberships
        .filter(
          (membership) =>
            membership.role === "MEMBER" && !directUserIds.has(membership.user.id),
        )
        .map((membership) => ({
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          organizationRole: membership.role,
        })),
    };

    if (!teamsByOrganizationId[team.organizationId]) {
      teamsByOrganizationId[team.organizationId] = [];
    }
    teamsByOrganizationId[team.organizationId]?.push(record);
  });

  Object.keys(teamsByOrganizationId).forEach((organizationId) => {
    teamsByOrganizationId[organizationId]?.sort((left, right) => left.name.localeCompare(right.name));
  });

  const organizationsForUi: OrganizationRecord[] = organizationMemberships.map((membership) => {
    const organization = organizationById.get(membership.organization.id);
    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      currentUserRole: membership.role,
      canManage: membership.role === "OWNER" || membership.role === "ADMIN",
      canEditName: membership.role === "OWNER" || membership.role === "ADMIN",
      members:
        organization?.memberships.map((entry) => ({
          userId: entry.user.id,
          name: entry.user.name,
          email: entry.user.email,
          role: entry.role,
        })) ?? [],
      pendingInvites:
        organization?.invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
        })) ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Create Organization"
        subtitle="Create a new organization workspace for teams, members, and permissions."
        preferenceKey="organizations-create-organization"
        defaultOpen={organizationsForUi.length === 0}
      >
        <CreateOrganizationForm />
      </AccordionCard>

      <AccordionCard
        title="Organizations"
        subtitle="Manage organization settings, invitations, and team membership assignments."
        preferenceKey="organizations-list"
        defaultOpen
        forceOpen={Boolean(focusOrganizationId)}
      >
        <OrganizationMembersManager
          currentUserId={user.id}
          initialOrganizations={organizationsForUi}
          initialTeamsByOrganizationId={teamsByOrganizationId}
          focusOrganizationId={focusOrganizationId}
        />
      </AccordionCard>
    </div>
  );
}
