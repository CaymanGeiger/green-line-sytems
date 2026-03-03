import { PermissionsTeamSelector } from "@/components/account/permissions-team-selector";
import { TeamPermissionsManager } from "@/components/account/team-permissions-manager";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Card } from "@/components/ui/card";
import { PERMISSION_ACTIONS, PERMISSION_RESOURCE_DEFINITIONS } from "@/lib/auth/permission-metadata";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const requestedTeamId = getStringParam(params.teamId);
  const { teams, activeTeamId } = await getActiveTeamContext(user.id);

  if (teams.length === 0) {
    return (
      <Card title="Permissions" subtitle="Team-scoped access control for every platform feature.">
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </Card>
    );
  }

  const teamAccess = (
    await Promise.all(
      teams.map(async (team) => {
        const [canView, canUpdate] = await Promise.all([
          canUserPerformTeamAction(user.id, team.id, "TEAM_PERMISSION", "VIEW"),
          canUserPerformTeamAction(user.id, team.id, "TEAM_PERMISSION", "UPDATE"),
        ]);
        return {
          team,
          canView,
          canUpdate,
        };
      }),
    )
  ).filter((entry) => entry.canView);

  if (teamAccess.length === 0) {
    return (
      <Card title="Permissions" subtitle="Team-scoped access control for every platform feature.">
        <p className="text-sm text-slate-500">You do not have permission to view team permissions.</p>
      </Card>
    );
  }

  const selectedTeamAccess =
    teamAccess.find((entry) => entry.team.id === requestedTeamId) ??
    teamAccess.find((entry) => entry.team.id === activeTeamId) ??
    teamAccess[0];
  if (!selectedTeamAccess) {
    return (
      <Card title="Permissions" subtitle="Team-scoped access control for every platform feature.">
        <p className="text-sm text-slate-500">Unable to resolve a team for permissions.</p>
      </Card>
    );
  }

  const selectedTeamId = selectedTeamAccess.team.id;
  const addTeamMemberHref = `/organizations?focusAction=add-member&focusOrganizationId=${encodeURIComponent(
    selectedTeamAccess.team.organizationId,
  )}`;
  const [teamScope, memberships, overrides] = await Promise.all([
    prisma.team.findUnique({
      where: {
        id: selectedTeamId,
      },
      select: {
        organization: {
          select: {
            memberships: {
              where: {
                role: {
                  in: ["OWNER", "ADMIN"],
                },
              },
              select: {
                userId: true,
                role: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.teamMembership.findMany({
      where: {
        teamId: selectedTeamId,
      },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.teamPermission.findMany({
      where: {
        teamId: selectedTeamId,
      },
      select: {
        userId: true,
        resource: true,
        action: true,
        allowed: true,
      },
    }),
  ]);

  const orgRoleByUserId = new Map(
    (teamScope?.organization.memberships ?? []).map((membership) => [membership.userId, membership.role]),
  );
  const totalPermissionCells = PERMISSION_RESOURCE_DEFINITIONS.length * PERMISSION_ACTIONS.length;
  const permissionStateByUserId = new Map<string, Map<string, boolean>>();
  overrides.forEach((override) => {
    const permissionKey = `${override.resource}:${override.action}`;
    const existing = permissionStateByUserId.get(override.userId) ?? new Map<string, boolean>();
    existing.set(permissionKey, override.allowed);
    permissionStateByUserId.set(override.userId, existing);
  });
  const teamAdminUserIds = new Set<string>();
  permissionStateByUserId.forEach((permissions, userId) => {
    if (permissions.size === totalPermissionCells && [...permissions.values()].every((allowed) => allowed)) {
      teamAdminUserIds.add(userId);
    }
  });

  const memberMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      role: "OWNER" | "MEMBER" | "TEAM_ADMIN" | "ORG_ADMIN" | "ORG_OWNER";
      roleSource: "TEAM" | "ORGANIZATION";
    }
  >();

  memberships.forEach((membership) => {
    if (membership.role === "OWNER") {
      memberMap.set(membership.userId, {
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        role: "OWNER",
        roleSource: "TEAM",
      });
      return;
    }

    const orgRole = orgRoleByUserId.get(membership.userId);
    if (orgRole === "OWNER" || orgRole === "ADMIN") {
      memberMap.set(membership.userId, {
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        role: orgRole === "OWNER" ? "ORG_OWNER" : "ORG_ADMIN",
        roleSource: "ORGANIZATION",
      });
      return;
    }

    memberMap.set(membership.userId, {
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
      role: teamAdminUserIds.has(membership.userId) ? "TEAM_ADMIN" : "MEMBER",
      roleSource: "TEAM",
    });
  });

  (teamScope?.organization.memberships ?? []).forEach((membership) => {
    if (memberMap.has(membership.userId)) {
      return;
    }

    memberMap.set(membership.userId, {
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role === "OWNER" ? "ORG_OWNER" : "ORG_ADMIN",
      roleSource: "ORGANIZATION",
    });
  });

  const roleSortOrder: Record<"OWNER" | "ORG_OWNER" | "ORG_ADMIN" | "TEAM_ADMIN" | "MEMBER", number> = {
    OWNER: 0,
    ORG_OWNER: 1,
    ORG_ADMIN: 2,
    TEAM_ADMIN: 3,
    MEMBER: 4,
  };

  const membersForUi = [...memberMap.values()].sort((left, right) => {
    const roleDelta = roleSortOrder[left.role] - roleSortOrder[right.role];
    if (roleDelta !== 0) {
      return roleDelta;
    }
    return left.name.localeCompare(right.name);
  });

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Permissions"
        subtitle="Configure which members can view, create, update, or delete each team feature."
        defaultOpen
      >
        <div className="mb-4">
          <PermissionsTeamSelector
            key={selectedTeamId}
            selectedTeamId={selectedTeamId}
            teams={teamAccess.map(({ team }) => ({
              id: team.id,
              name: team.name,
              organizationName: team.organizationName,
            }))}
          />
        </div>

        <TeamPermissionsManager
          key={selectedTeamId}
          teamId={selectedTeamId}
          canUpdate={selectedTeamAccess.canUpdate}
          addTeamMemberHref={addTeamMemberHref}
          members={membersForUi}
          overrides={overrides.map((override) => ({
            userId: override.userId,
            resource: override.resource,
            action: override.action,
            allowed: override.allowed,
          }))}
        />
      </AccordionCard>
    </div>
  );
}
